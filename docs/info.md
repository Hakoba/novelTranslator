# Описание проекта-шаблона

Этот репозиторий — современный шаблон для разработки браузерных расширений на базе Vite и Vue 3 (Manifest V3). Поддерживаются Chrome и Firefox. Шаблон помогает быстро стартовать и содержит готовые заготовки для разных контекстов расширения: background, popup, options, content script, devtools, side panel и offscreen.

## Возможности

- Vite + Vue 3 (Composition API)
- TypeScript и строгая типизация
- File-based routing для UI-страниц (`src/ui/*/pages`)
- Состояние через Pinia
- Компоненты Nuxt/UI v3 и shadcn-vue, стили — Tailwind CSS 4
- Утилиты для WebExtension: `webext-bridge`, `webextension-polyfill`
- Готовые точки входа для разных контекстов (content script, devtools и др.)

## Быстрый старт

1. Установить зависимости:
   - `npm install`
2. Запуск в режиме разработки:
   - Все браузеры: `npm run dev`
   - Только Chrome: `npm run dev:chrome`
   - Только Firefox (watch-сборка): `npm run dev:firefox`
3. Сборка продакшн-версии:
   - Все таргеты: `npm run build`
   - Chrome: `npm run build:chrome`
   - Firefox: `npm run build:firefox`
4. Загрузка расширения в браузер:
   - Chrome: загрузить папку `dist/chrome`
   - Firefox: загрузить папку `dist/firefox`

Полезные команды:
- Линтинг: `npm run lint`
- Типы: `npm run typecheck`
- Форматирование: `npm run format`

## Структура папок (основное)

- `src/assets/` — глобальные ресурсы (CSS, изображения)
- `src/background/` — background-скрипты (жизненный цикл, логика установки/обновления)
- `src/components/` — общие Vue-компоненты
- `src/composables/` — композиционные функции (hooks)
- `src/content-script/` — скрипты для страниц (инъекция в DOM, взаимодействие со страницей)
- `src/devtools/`, `src/offscreen/`, `src/side-panel/` — специализированные контексты
- `src/stores/` — хранилища Pinia
- `src/types/` — типы TypeScript
- `src/ui/` — UI точки входа (popup, options, setup и т.д.)
- `src/utils/` — утилиты (router, i18n, pinia и др.)

## Рекомендации по разработке

- Использовать Composition API и композиционные функции для переиспользования логики
- Строгая типизация, без `any` и без приведения типов через `as`
- Небольшие, фокусные компоненты; единая ответственность файлов
- Тестировать в Chrome и Firefox
- Для общих задач (тема, i18n, storage) использовать composables

## Дополнительно

- Подробности по архитектуре и принципы — в `docs/DEVELOPMENT.md`
- Скриншоты и примеры UI смотрите в папке `screenshots/` (если применимо)

Если вы используете этот шаблон, не забудьте обновить название проекта, описание и ссылки в `package.json` и `README.md` под свой продукт.