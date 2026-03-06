from __future__ import annotations

from typing import List

from .models import Checklist, ChecklistItem, Priority, TestSuite


def checklist_from_suite(suite: TestSuite) -> Checklist:
    """
    Строит чек-лист из набора тест-кейсов:
    по одному пункту на каждый кейс.
    """
    items: List[ChecklistItem] = []
    for case in suite.cases:
        items.append(
            ChecklistItem(
                id=case.id,
                title=case.title,
                description=case.description or case.expected_result,
                priority=case.priority or Priority.MEDIUM,
                tags=case.tags,
            )
        )
    return Checklist(feature=suite.suite, items=items)


def checklist_to_markdown(checklist: Checklist) -> str:
    """
    Простой Markdown-формат чек-листа:
    - группировка по фиче
    - список кейсов с приоритетами и тегами.
    """
    lines: list[str] = []
    lines.append(f"# Чек-лист: {checklist.feature}")
    lines.append("")

    for item in checklist.items:
        tags = f" [tags: {', '.join(item.tags)}]" if item.tags else ""
        lines.append(f"- [ ] **{item.id} — {item.title}** (priority: {item.priority.value}){tags}")
        if item.description:
            lines.append(f"  - {item.description}")

    lines.append("")
    return "\n".join(lines)

