from __future__ import annotations

import asyncio
from datetime import datetime
from pathlib import Path
from typing import Optional

import typer
from rich import print
from rich.prompt import Confirm

from . import __version__
from .config import AIConfig
from .models import TestRunResult, TestSuite
from . import llm_agent  # type: ignore[reportMissingImports]
from . import docs as docs_module  # type: ignore[reportMissingImports]
from . import runner as runner_module  # type: ignore[reportMissingImports]


app = typer.Typer(help="AI-агент для тестовой документации и ручного тестирования.")


def _load_suite(path: Path) -> TestSuite:
    if not path.exists():
        raise typer.BadParameter(f"Файл с тест-кейсами не найден: {path}")

    import json
    import yaml

    text = path.read_text(encoding="utf-8")

    if path.suffix.lower() in {".yml", ".yaml"}:
        data = yaml.safe_load(text)
    else:
        data = json.loads(text)

    return TestSuite.model_validate(data)


def _save_run_result(result: TestRunResult, path: Path) -> None:
    import json

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(result.model_dump(mode="json"), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


@app.callback()
def main(
    version: Optional[bool] = typer.Option(
        None,
        "--version",
        "-v",
        help="Показать версию и выйти.",
    ),
) -> None:
    if version:
        print(f"[bold]ai-tester[/bold] v{__version__}")
        raise typer.Exit()


@app.command(help="Сгенерировать тестовую документацию (кейсы + чек-лист) из описания фичи.")
def docs(
    feature: str = typer.Argument(..., help="Название фичи/области тестирования."),
    source: Optional[Path] = typer.Option(
        None,
        "--source",
        "-s",
        help="Файл с описанием требований/тикета. Если не указан — читаем stdin.",
    ),
    output: Optional[Path] = typer.Option(
        None,
        "--out",
        "-o",
        help="Путь для сохранения JSON/YAML с тестами. По умолчанию — tests/ai-docs/<feature>.yaml.",
    ),
    checklist_md: Optional[Path] = typer.Option(
        None,
        "--checklist-md",
        help="Путь для сохранения чек-листа в Markdown. По умолчанию — tests/ai-docs/<feature>-checklist.md.",
    ),
) -> None:
    cfg = AIConfig.load()

    if source is not None:
        text = source.read_text(encoding="utf-8")
    else:
        print("[cyan]Читаю описание фичи из stdin. Завершите ввод Ctrl+D (Linux/macOS) или Ctrl+Z (Windows).[/cyan]")
        text = typer.get_text_stream("stdin").read()

    if not text.strip():
        raise typer.BadParameter("Описание фичи пустое.")

    print("[cyan]Генерирую тест-кейсы с помощью LLM...[/cyan]")
    suite: TestSuite = llm_agent.generate_suite_from_text(text, feature=feature, config=cfg.llm)

    docs_dir = cfg.docs_dir
    docs_dir.mkdir(parents=True, exist_ok=True)

    if output is None:
        output = docs_dir / f"{feature}.yaml"

    import yaml

    output.write_text(
        yaml.safe_dump(
            suite.model_dump(mode="python"),
            sort_keys=False,
            allow_unicode=True,
        ),
        encoding="utf-8",
    )

    if checklist_md is None:
        checklist_md = docs_dir / f"{feature}-checklist.md"

    checklist = docs_module.checklist_from_suite(suite)
    md = docs_module.checklist_to_markdown(checklist)
    checklist_md.write_text(md, encoding="utf-8")

    print(f"[green]Тест-кейсы сохранены в:[/green] {output}")
    print(f"[green]Чек-лист сохранён в:[/green] {checklist_md}")


@app.command(help="Полу-автоматический прогон заранее описанных сценариев.")
def run(
    suite_path: Path = typer.Argument(..., help="Путь к JSON/YAML-файлу с TestSuite."),
    env: Optional[str] = typer.Option(
        None,
        "--env",
        "-e",
        help="Имя окружения из ai-tester.config.yaml (dev/stage/prod и т.п.).",
    ),
    out: Optional[Path] = typer.Option(
        None,
        "--out",
        "-o",
        help="Путь для сохранения JSON-отчёта о прогоне. По умолчанию — tests/ai-sessions/run-<ts>.json.",
    ),
) -> None:
    cfg = AIConfig.load()
    suite = _load_suite(suite_path)

    env_cfg = None
    if env is not None:
        env_cfg = next((e for e in cfg.envs if e.name == env), None)
        if env_cfg is None:
            raise typer.BadParameter(f"Окружение '{env}' не найдено в ai-tester.config.yaml")

    print("[cyan]Запускаю прогон сценариев...[/cyan]")

    result: TestRunResult = asyncio.run(
        runner_module.run_suite(
            suite=suite,
            env_name=env_cfg.name if env_cfg else None,
            base_url=env_cfg.base_url if env_cfg else None,
            api_base_url=env_cfg.api_base_url if env_cfg else None,
        )
    )

    sessions_dir = cfg.sessions_dir
    sessions_dir.mkdir(parents=True, exist_ok=True)

    if out is None:
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        out = sessions_dir / f"run-{timestamp}.json"

    _save_run_result(result, out)
    print(f"[green]JSON-отчёт о прогоне сохранён в:[/green] {out}")

    summary_md = llm_agent.summarize_run_to_markdown(result)
    summary_path = out.with_suffix(".md")
    summary_path.write_text(summary_md, encoding="utf-8")
    print(f"[green]Резюме прогона сохранено в:[/green] {summary_path}")


@app.command(help="Интерактивная сессия ручного тестирования с поддержкой автошагов UI/API.")
def session(
    suite_path: Path = typer.Argument(..., help="Путь к JSON/YAML-файлу с TestSuite."),
    env: Optional[str] = typer.Option(
        None,
        "--env",
        "-e",
        help="Имя окружения из ai-tester.config.yaml.",
    ),
) -> None:
    cfg = AIConfig.load()
    suite = _load_suite(suite_path)

    env_cfg = None
    if env is not None:
        env_cfg = next((e for e in cfg.envs if e.name == env), None)
        if env_cfg is None:
            raise typer.BadParameter(f"Окружение '{env}' не найдено в ai-tester.config.yaml")

    print(f"[bold]Интерактивная сессия для фичи:[/bold] {suite.suite}")
    print("[cyan]Буду предлагать тест-кейсы по очереди. Можно включать автошаги или проходить кейсы руками.[/cyan]")

    manual_notes = []

    for case in suite.cases:
        print()
        print(f"[bold]Кейс:[/bold] {case.id} — {case.title}")
        if not Confirm.ask("Запускать этот кейс?", default=True):
            continue

        auto = Confirm.ask("Пробовать автоматически выполнять ui/api шаги?", default=True)

        if auto:
            case_result = asyncio.run(
                runner_module.run_single_case(
                    case=case,
                    env_name=env_cfg.name if env_cfg else None,
                    base_url=env_cfg.base_url if env_cfg else None,
                    api_base_url=env_cfg.api_base_url if env_cfg else None,
                )
            )
        else:
            case_result = runner_module.create_empty_case_result(case)

        for step in case.steps:
            print(f"- Шаг {step.id}: {step.description}")
            if step.type.name.lower() == "manual":
                passed = Confirm.ask("Шаг выполнен успешно?", default=True)
                note = typer.prompt("Замечания/фактический результат (опционально)", default="")
                manual_notes.append((case.id, step.id, note))
                runner_module.mark_manual_step(case_result, step_id=step.id, passed=passed, note=note)

        print(f"[green]Кейс {case.id} завершён со статусом {case_result.status}.[/green]")

    print("[bold green]Сессия завершена.[/bold green]")
    if manual_notes:
        print("[cyan]Собраны заметки по ручным шагам, их можно использовать для баг-репортов.[/cyan]")


def run_cli() -> None:
    app()


if __name__ == "__main__":
    run_cli()

