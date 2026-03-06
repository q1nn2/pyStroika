from __future__ import annotations

from typing import Optional

import httpx

from .models import APIAction


class APIExecutor:
    """
    Простой HTTP-клиент поверх httpx для выполнения APIAction.
    """

    def __init__(self, base_url: Optional[str] = None) -> None:
        self._base_url = base_url

    async def run_action(self, action: APIAction) -> str:
        async with httpx.AsyncClient(base_url=self._base_url, timeout=30) as client:
            resp = await client.request(
                method=action.method,
                url=action.path,
                params=action.query or None,
                headers=action.headers or None,
                json=action.body,
            )

            if resp.status_code != action.expected_status:
                return f"Ожидался статус {action.expected_status}, получен {resp.status_code}. Тело: {resp.text[:500]}"

            if action.expected_body_contains is not None:
                try:
                    data = resp.json()
                except ValueError:
                    return f"Ожидался JSON-ответ, получен текст: {resp.text[:200]}"

                for key, value in action.expected_body_contains.items():
                    if data.get(key) != value:
                        return (
                            f"Ожидалось поле {key}={value!r}, фактически {data.get(key)!r}. "
                            f"Часть тела: {str(data)[:500]}"
                        )

            return f"Успешный ответ {resp.status_code}"

