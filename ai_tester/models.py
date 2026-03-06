from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class StepType(str, Enum):
    UI = "ui"
    API = "api"
    MANUAL = "manual"


class StepStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    PASSED = "pass"
    FAILED = "fail"
    BLOCKED = "blocked"
    NEEDS_CHECK = "needs_check"


class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class UIAction(BaseModel):
    """Структура действий для browser_executor."""

    kind: str = Field(
        ...,
        description="Тип действия: open_url, click, fill, wait_for_text и т.п.",
    )
    selector: Optional[str] = Field(
        None, description="CSS / тестовый селектор для действия, если применимо."
    )
    text: Optional[str] = Field(None, description="Текст для ввода/проверки.")
    url: Optional[str] = Field(
        None, description="URL для открытия, если kind == open_url."
    )
    extra: Dict[str, Any] = Field(
        default_factory=dict, description="Дополнительные параметры для исполнителя."
    )


class APIAction(BaseModel):
    """Структура действий для api_executor."""

    method: str = Field(..., description="HTTP-метод: GET, POST, PUT и т.д.")
    path: str = Field(..., description="Путь относительно base_url (например, /auth).")
    query: Dict[str, Any] = Field(
        default_factory=dict, description="Параметры строки запроса."
    )
    headers: Dict[str, str] = Field(
        default_factory=dict, description="Дополнительные заголовки."
    )
    body: Optional[Dict[str, Any]] = Field(
        default=None, description="Тело запроса (JSON)."
    )
    expected_status: int = Field(
        200, description="Ожидаемый HTTP-статус ответа."
    )
    expected_body_contains: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Ключи/значения, которые должны присутствовать в JSON-ответе.",
    )


class TestStep(BaseModel):
    """Один шаг тест-кейса."""

    id: int = Field(..., description="Порядковый номер шага в кейсе.")
    description: str = Field(..., description="Человекочитаемое описание шага.")
    type: StepType = Field(..., description="Тип шага: ui/api/manual.")
    action: Optional[Dict[str, Any]] = Field(
        default=None,
        description=(
            "Структурированное описание действия. Для ui ожидается форма UIAction,"
            " для api — APIAction. Для manual может быть None."
        ),
    )
    expected: Optional[str] = Field(
        default=None,
        description="Краткое описание ожидаемого результата именно для этого шага.",
    )


class TestCase(BaseModel):
    """Тест-кейс для конкретной фичи."""

    id: str = Field(..., description="Уникальный идентификатор тест-кейса.")
    title: str = Field(..., description="Краткое название кейса.")
    description: Optional[str] = Field(
        default=None, description="Расширенное описание/цель кейса."
    )
    feature: Optional[str] = Field(
        default=None, description="Связанная фича/модуль системы."
    )
    preconditions: List[str] = Field(
        default_factory=list,
        description="Предусловия: что должно быть выполнено/настроено до старта.",
    )
    steps: List[TestStep] = Field(
        default_factory=list, description="Шаги сценария."
    )
    expected_result: str = Field(
        ..., description="Итоговый ожидаемый результат всего кейса."
    )
    priority: Priority = Field(
        default=Priority.MEDIUM, description="Приоритет кейса."
    )
    tags: List[str] = Field(
        default_factory=list,
        description="Произвольные теги: smoke, regression, api, ui и т.п.",
    )


class TestSuite(BaseModel):
    """Набор тест-кейсов для одной фичи или модуля."""

    suite: str = Field(..., description="Название набора/фичи.")
    feature: Optional[str] = Field(
        default=None, description="Дополнительное название фичи, если нужно."
    )
    description: Optional[str] = Field(
        default=None, description="Общее описание области тестирования."
    )
    cases: List[TestCase] = Field(
        default_factory=list, description="Список тест-кейсов."
    )


class StepResult(BaseModel):
    step_id: int
    status: StepStatus
    actual: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    attachments: List[str] = Field(
        default_factory=list,
        description="Ссылки на скриншоты, файлы логов и др. артефакты.",
    )


class CaseResult(BaseModel):
    case_id: str
    status: StepStatus
    step_results: List[StepResult] = Field(default_factory=list)
    notes: Optional[str] = None


class TestRunStatus(str, Enum):
    PASSED = "pass"
    FAILED = "fail"
    PARTIAL = "partial"


class TestRunResult(BaseModel):
    """Результат одного прогона набора тест-кейсов."""

    id: str = Field(..., description="Идентификатор прогона (например, timestamp).")
    suite_name: str
    started_at: datetime
    finished_at: datetime
    env: Optional[str] = Field(default=None, description="Окружение: dev/stage/prod.")
    summary_status: TestRunStatus
    case_results: List[CaseResult] = Field(default_factory=list)
    extra: Dict[str, Any] = Field(default_factory=dict)


class ChecklistItem(BaseModel):
    """Элемент чек-листа для быстрого прогона."""

    id: str = Field(..., description="Например, ссылка на test case id.")
    title: str
    description: Optional[str] = None
    priority: Priority = Priority.MEDIUM
    tags: List[str] = Field(default_factory=list)


class Checklist(BaseModel):
    """Чек-лист для ручного тестирования."""

    feature: str
    items: List[ChecklistItem] = Field(default_factory=list)

