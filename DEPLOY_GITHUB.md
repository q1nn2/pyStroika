# Размещение игры на GitHub Pages

## Шаг 1. Создай репозиторий на GitHub

1. Зайди на [github.com](https://github.com)
2. Нажми **New repository** (или "+" → "New repository")
3. **Repository name:** `stroika` (или любое название)
4. Выбери **Public**
5. **НЕ** ставь галочку "Add a README" — файлы уже есть локально
6. Нажми **Create repository**

## Шаг 2. Загрузи код

В терминале (папка `c:\Users\onotoly\Desktop\test`):

```powershell
git remote add origin https://github.com/ВАШ_ЛОГИН/stroika.git
git branch -M main
git push -u origin main
```

Замени **ВАШ_ЛОГИН** на свой логин GitHub, и **stroika** — на название репо, если выбрал другое.

## Шаг 3. Включи GitHub Pages

1. Открой свой репозиторий на GitHub
2. **Settings** → слева **Pages**
3. В блоке **Source** выбери **Deploy from a branch**
4. В **Branch** выбери **main** (или **master**), папка **/ (root)**
5. Нажми **Save**

Через 1–2 минуты игра будет доступна по адресу:
**https://ВАШ_ЛОГИН.github.io/stroika/**
