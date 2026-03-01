# pyStroika — Python Learning Game

[![Deploy](https://github.com/q1nn2/pyStroika/actions/workflows/pages/pages-build-deployment/badge.svg)](https://github.com/q1nn2/pyStroika/actions/workflows/pages/pages-build-deployment)
[![Demo](https://img.shields.io/badge/Live_Demo-q1nn2.github.io%2FpyStroika-F97316?style=flat-square&logo=github)](https://q1nn2.github.io/pyStroika/)
[![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![HTML5 Canvas](https://img.shields.io/badge/HTML5-Canvas-E34F26?style=flat-square&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)

> Браузерная образовательная игра: управляй строительным краном, написав код на Python прямо в браузере. Без установок — открыл и играешь.

---

<!-- Запишите GIF через ScreenToGif: откройте игру → пройдите уровень → сохраните как docs/demo.gif -->
<!-- ![Demo](docs/demo.gif) -->

## Играть онлайн

**[q1nn2.github.io/pyStroika](https://q1nn2.github.io/pyStroika/)**

## Особенности

- Изометрическая 3D-сцена на HTML5 Canvas
- 7 уровней сложности: от одной команды до функций и циклов
- Кастомный Python-интерпретатор — код выполняется прямо в браузере (без сервера)
- Система прогресса и очков
- Список команд и подсказки внутри игры

## Уровни

| # | Название | Концепция | Очки |
|---|---|---|---|
| 1 | Первый кирпич | Команды | 10 |
| 2 | Ряд кирпичей | Последовательность | 20 |
| 3 | Цикл — строим ряд | Цикл `for` | 30 |
| 4 | Переменная — счётчик | Переменные | 40 |
| 5 | Объезд препятствия | Условие `if` | 60 |
| 6 | Функция строителя | Функции | 80 |
| 7 | Построй дом! | Всё вместе | 100 |

## Стек

| Технология | Назначение |
|---|---|
| Vanilla JS | Логика игры, интерпретатор |
| HTML5 Canvas | Изометрическая 3D-сцена |
| Skulpt.js | Выполнение Python-кода в браузере |
| GitHub Pages | Хостинг |

## Структура проекта

```
pyStroika/
├── assets/               # Изображения и спрайты
├── css/
│   └── main.css          # Стили
├── data/
│   └── levels.json       # Задания, тесты, описания уровней
├── js/                   # Логика: редактор, выполнение кода, проверка, прогресс
├── game.html             # Страница игры (уровень)
├── index.html            # Меню выбора уровней
├── progress.html         # Страница прогресса
├── splash.html           # Заставка
└── README.md
```

## Локальный запуск

```bash
# Вариант 1: запустить start-server.bat (Windows)
start-server.bat

# Вариант 2: Python HTTP сервер
python -m http.server 8000
# Открыть: http://localhost:8000
```
