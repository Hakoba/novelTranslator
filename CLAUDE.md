# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repository.

## Project Overview

**novelTranslator** — браузерное расширение (Manifest V3, Chrome + Firefox) для чтения
англоязычных новелл на novelbin.com: парсит текст главы, прогоняет через LLM, показывает
сложные слова/фразы уровня B1 с переводом и объяснением, даёт сохранять выделенное в личный
словарь (синк через `chrome.storage.sync`).

Скоуп MVP и что вынесено за него: `docs/projectInfo.md`. Текущий план работ: `plan.md`.
Шаблон, на котором собран проект: `docs/info.md`, `README.md`.

## Commands

```bash
npm run dev:chrome     # dev-сборка Chrome (vite.chrome.config.ts)
npm run dev:firefox    # dev-сборка Firefox (watch)
npm run dev            # обе сразу
npm run build          # прод-сборка обоих браузеров → dist/chrome, dist/firefox
npm run typecheck      # vue-tsc --noEmit
npm run lint           # eslint --fix --cache
npm run lint:manifest  # web-ext lint
npm run launch         # запустить браузер с загруженным расширением (scripts/launch.ts)
```

Расширение грузится из `dist/chrome` / `dist/firefox`.

## Architecture

Архитектура, структура папок и принципы — `docs/DEVELOPMENT.md`. Кратко:

- Мультиконтекст: `src/background`, `src/content-script`, `src/ui/*` (popup, options, …),
  `src/devtools`, `src/offscreen`.
- File-based routing по `src/ui/*/pages`, автоимпорты (компоненты, сторы, composables).
- Состояние — Pinia (`src/stores`), UI — PrimeVue + Tailwind 4, i18n — vue-i18n (`src/locales`).
- Кросс-контекстные сообщения — `webext-bridge`, браузерные API — `webextension-polyfill`.
- Манифест собирается из `manifest.config.ts` (+ `manifest.chrome.config.ts` /
  `manifest.firefox.config.ts`), сборка — `vite.chrome.config.ts` / `vite.firefox.config.ts`.
- UI на странице — только Shadow DOM, без iframe (стили сайта не должны ломать карточку).

## Code Conventions

Обязательны к соблюдению: `.junie/guidelines.md` (типизация, структура Vue-компонентов,
семантическая вёрстка, именование). Ключевое: строгие типы у `ref`/`computed` и return-типы
функций, никаких `as Type` — только type guards, ref на DOM через `$`-префикс.

## Agent tooling

- `.claude/skills/` — скиллы (симлинки в `.agents/skills/`, версии в `skills-lock.json`).
- `.claude/commands/opsx/` — команды openspec (propose / apply / archive / explore),
  спеки живут в `openspec/`.
