from __future__ import annotations

import json
import os
import re
from typing import Any, Dict

import httpx

from .config import LLMConfig
from .models import TestRunResult, TestSuite


class LLMError(RuntimeError):
    pass


def _extract_json_from_text(text: str) -> Dict[str, Any]:
    """
    Пытается вытащить JSON из ответа модели.
    Поддерживает формат с ```json ... ``` и «голый» JSON.
    """
    fenced = re.search(r"```json(.*?)```", text, flags=re.DOTALL | re.IGNORECASE)
    payload = fenced.group(1) if fenced else text
    payload = payload.strip()
    return json.loads(payload)


def _chat_completion(config: LLMConfig, messages: list[dict[str, str]]) -> str:
    api_key = os.getenv(config.api_key_env)
    if not api_key:
        raise LLMError(
            f"Не найден API-ключ в переменной окружения {config.api_key_env}. "
            "Задайте ключ и повторите попытку."
        )

    url = f"{config.base_url.rstrip('/')}/chat/completions"

    body = {
        "model": config.model,
        "temperature": config.temperature,
        "messages": messages,
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    with httpx.Client(timeout=60) as client:
        resp = client.post(url, json=body, headers=headers)
        resp.raise_for_status()
        data = resp.json()

    try:
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as exc:
        raise LLMError(f"Неожиданный формат ответа LLM: {data}") from exc


def generate_suite_from_text(text: str, feature: str, config: LLMConfig) -> TestSuite:
    """
    Генерирует TestSuite на основе текстового описания фичи.

    Модель получает инструкцию вернуть строго валидный JSON,
    совместимый с схемой TestSuite/TestCase/TestStep.
    """
    system_prompt = (
        "Ты опытный QA-инженер. По текстовому описанию фичи ты составляешь "
        "структурированные тест-кейсы в формате JSON, который соответствует "
        "схеме TestSuite/TestCase/TestStep:\n"
        "- TestSuite: { suite: str, description?: str, cases: TestCase[] }\n"
        "- TestCase: { id: str, title: str, description?: str, feature?: str, "
        "preconditions: str[], steps: TestStep[], expected_result: str, "
        "priority: 'low'|'medium'|'high'|'critical', tags: str[] }\n"
        "- TestStep: { id: int, description: str, type: 'ui'|'api'|'manual', "
        "action?: object, expected?: str }.\n"
        "Для type 'ui' поле action должно соответствовать UIAction, для 'api' — APIAction. "
        "Верни ТОЛЬКО JSON, без пояснений."
    )

    user_prompt = (
        f"Фича: {feature}\n\n"
        "Описание фичи/требований:\n"
        f"{text}\n\n"
        "Составь небольшой, но показательный набор тест-кейсов (3-10 штук), "
        "покрывающих позитивные и ключевые негативные сценарии."
    )

    content = _chat_completion(
        config,
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )

    data = _extract_json_from_text(content)
    return TestSuite.model_validate(data)


def summarize_run_to_markdown(run: TestRunResult) -> str:
    """
    Строит человеку понятное резюме прогона.
    Для простоты реализовано локально, без LLM.
    """
    lines: list[str] = []
    lines.append(f"# Отчёт о прогоне: {run.id}")
    lines.append("")
    lines.append(f"- Suite: {run.suite_name}")
    lines.append(f"- Окружение: {run.env or '-'}")
    lines.append(f"- Старт: {run.started_at.isoformat()}")
    lines.append(f"- Завершение: {run.finished_at.isoformat()}")
    lines.append(f"- Итоговый статус: **{run.summary_status.value}**")
    lines.append("")

    lines.append("## Кейсы")
    lines.append("")
    for case_result in run.case_results:
        lines.append(f"### Кейс {case_result.case_id}")
        lines.append(f"- Статус: **{case_result.status.value}**")
        if case_result.notes:
            lines.append(f"- Заметки: {case_result.notes}")

        if case_result.step_results:
            lines.append("")
            lines.append("| Шаг | Статус | Фактический результат |")
            lines.append("| --- | ------ | --------------------- |")
            for step in case_result.step_results:
                actual = (step.actual or "").replace("\n", " ")
                lines.append(f"| {step.step_id} | {step.status.value} | {actual} |")
            lines.append("")

    return "\n".join(lines)

