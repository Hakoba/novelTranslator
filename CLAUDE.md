# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repository.

## Project Overview

**novelTranslator** — браузерное расширение (Manifest V3, Chrome + Firefox) для чтения
англоязычных новелл: собирает текст главы, прогоняет через локальную LLM, показывает сложные
слова и фразы уровня B1 с переводом и пояснением, подсвечивает их в тексте страницы.
Работает только на сайтах из списка разрешённых (по умолчанию `novelbin.com`).

Что готово и что дальше — `docs/projectInfo.md`. Архитектура — `docs/DEVELOPMENT.md`.

## Commands

```bash
npm run dev:chrome     # dev-сборка Chrome (vite.chrome.config.ts)
npm run dev:firefox    # dev-сборка Firefox (watch)
npm run dev            # обе сразу
npm run build          # прод-сборка обоих браузеров → dist/chrome, dist/firefox
npm run typecheck      # vue-tsc --noEmit
npm run lint           # eslint --fix --cache
npm test               # node:test через tsx (*.test.ts рядом с кодом)
npm run lint:manifest  # web-ext lint
npm run launch         # запустить браузер с загруженным расширением (scripts/launch.ts)
```

## Architecture

- Контексты: `src/background` (service worker), `src/content-script` (оверлей),
  `src/ui/*` (popup, options, setup), `src/devtools`, `src/offscreen`.
- File-based routing по `src/ui/*/pages`; общая инициализация страниц — `src/utils/createPage.ts`.
- UI — **только PrimeVue** + Tailwind 4, компоненты автоимпортируются (`PrimeVueResolver`),
  тема Aura, тёмная тема по классу `.dark`. Иконки — `lucide-vue-next`.
- Состояние — Pinia и composables поверх `chrome.storage` (`useBrowserStorage`).
- Браузерные API — `webextension-polyfill` (promise-стиль).
- Манифест — `manifest.config.ts` (+ chrome/firefox варианты), сборка — `vite.*.config.ts`.

Ключевые инварианты (нарушение ломает вёрстку сайта или запросы к модели):

- **Никакого глобального CSS в документ страницы.** Оверлей рендерится в Shadow DOM, стили
  инлайнятся внутрь (`overlay.css?inline`), стили PrimeVue зеркалятся из `document.head`
  (`src/content-script/mirrorStyles.ts`), подсветка ставится инлайном на элемент.
- **PrimeVue Dialog/Popover в оверлее не использовать** — они рендерятся в `document.body`,
  вне shadow root, и остаются без стилей. Верстать панели вручную.
- **Запросы к LLM только через background** (`src/utils/bgFetch.ts`): со https-страницы
  content script не достучится до http-адреса локальной модели.
- **Адрес модели и ключи — в настройках** (`useLlmSettings`), не в коде: репозиторий публичный.
  Дефолты для dev-сборки приходят из `.env` через `define.config.mjs` и обнуляются
  в прод-сборке; `.env` в `.gitignore`, шаблон — `.env.example`.
- **Провайдер один — OpenAI-совместимый API.** Yandex AI Studio к нему совместим
  (`https://llm.api.cloud.yandex.net`, модель `gpt://<каталог>/yandexgpt/latest`,
  ключ уходит в `Authorization: Bearer`), отдельный клиент не нужен.

## Code Conventions

Обязательны: `.junie/guidelines.md` (типизация, структура компонентов, семантическая вёрстка,
именование). Ключевое: типы у `ref`/`computed` и return-типы функций, никаких `as Type` —
только type guards, ref на DOM через `$`-префикс.

Логику с ветвлениями выносить в модуль без браузерных API и покрывать тестом рядом
(`llmParse.ts` / `matchesSite.ts` — образцы).

## Agent tooling

- `.claude/skills/` — скиллы (симлинки в `.agents/skills/`, версии в `skills-lock.json`).
  Полезны: `kill-ai-slop` (есть скрипт `scripts/scan.mjs <dir>`), `design-taste-frontend`.
- `.claude/commands/opsx/` — команды openspec (propose / apply / archive / explore),
  спеки живут в `openspec/`.
