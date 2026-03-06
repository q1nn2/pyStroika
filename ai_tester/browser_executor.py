from __future__ import annotations

from typing import Optional

from playwright.async_api import Page, async_playwright

from .models import UIAction


class BrowserExecutor:
    """
    Обёртка над Playwright для выполнения UIAction.

    Выполняет простые шаги:
    - open_url
    - click
    - fill
    - wait_for_text
    """

    def __init__(self, base_url: Optional[str] = None) -> None:
        self._base_url = base_url.rstrip("/") if base_url else None
        self._page: Optional[Page] = None
        self._playwright = None
        self._browser = None

    async def __aenter__(self) -> "BrowserExecutor":
        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(headless=True)
        context = await self._browser.new_context()
        self._page = await context.new_page()
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()

    async def run_action(self, action: UIAction) -> str:
        if not self._page:
            raise RuntimeError("BrowserExecutor не инициализирован. Используйте контекстный менеджер.")

        page = self._page

        if action.kind == "open_url":
            url = action.url
            if self._base_url and url and url.startswith("/"):
                url = f"{self._base_url}{url}"
            if not url:
                raise ValueError("Для действия open_url требуется поле url.")
            await page.goto(url)
            return f"Открыт URL: {url}"

        if action.kind == "click":
            if not action.selector:
                raise ValueError("Для действия click требуется selector.")
            await page.click(action.selector)
            return f"Клик по селектору {action.selector}"

        if action.kind == "fill":
            if not action.selector:
                raise ValueError("Для действия fill требуется selector.")
            await page.fill(action.selector, action.text or "")
            return f"Ввод текста в {action.selector}"

        if action.kind == "wait_for_text":
            if not action.text:
                raise ValueError("Для действия wait_for_text требуется text.")
            await page.wait_for_timeout(action.extra.get("timeout_ms", 5000))
            # Упрощённая реализация: можно доработать до ожидания конкретного селектора/текста.
            return f"Ожидание текста '{action.text}' (псевдо-ожидание)"

        raise ValueError(f"Неизвестный тип UIAction: {action.kind}")

