# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repository.

## Project Overview

**novelTranslator** — браузерное расширение (Manifest V3, Chrome + Firefox) для чтения
англоязычных текстов: собирает текст страницы, прогоняет через LLM, показывает сложные
слова и фразы выше уровня читателя с переводом и пояснением, подсвечивает их на странице
и складывает в словарь. Работает только на сайтах из списка разрешённых
(по умолчанию `novelbin.com`).

Что готово и что дальше — `docs/projectInfo.md`. Архитектура — `docs/DEVELOPMENT.md`.
Отложенные решения — `deferred.md`: класть туда вопросы, которые сознательно упростили,
и смотреть перед реализацией новых фич (там же триггеры возврата).

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
- **PrimeVue Dialog/Popover/Tooltip в оверлее не использовать** — они рендерятся
  в `document.body`, вне shadow root, и остаются без стилей. Панели верстать вручную,
  подсказка к кнопке — атрибут `data-hint` (правило в `overlay.css`). Селектор там
  удвоен намеренно: стили PrimeVue зеркалятся позже и при равном весе перебивают.
- **Тема оверлея — класс `.dark` на `.nt-overlay` внутри shadow root**, не на `<html>` сайта:
  PrimeVue кладёт светлые токены на `:root,:host`, а `:host` — сам хост оверлея, он
  перебивает всё наследуемое снаружи. По той же причине `overlay.css` объявляет цвета через
  **`@theme inline`**: без `inline` `var(--p-*)` вычисляется на `:host` и вниз приходит светлым.
- **Запросы наружу только через background** (`src/utils/bgFetch.ts`): со https-страницы
  content script не достучится до http-адреса локальной модели, а CSP сайта режет fetch
  к чужим доменам (проверено на reddit). URL логируем без query — у словарей ключ в адресе.
- **WASM нужен свой CSP.** sql.js (экспорт в Anki) не запустится без
  `script-src 'self' 'wasm-unsafe-eval'` в `content_security_policy.extension_pages`.
- **Словарь — в `storage.local`, настройки — в `storage.sync`.** У `sync` лимит 100 КБ на всё
  и 8 КБ на запись. Доступ к словарю только через `useDictionary` — компоненты в storage
  не ходят, чтобы серверный словарь заменялся одной реализацией.
- **`useBrowserStorage` не хранит `Record`**: `mergeDeep` идёт по ключам дефолта и у пустого
  объекта вычистит сохранённое. Для «ключ → значение» — массив записей (`useAreaSelectors`).
- **Адрес модели и ключи — в настройках** (`useLlmSettings`), не в коде: репозиторий публичный.
  Дефолты для dev-сборки приходят из `.env` через `define.config.mjs` и обнуляются
  в прод-сборке; `.env` в `.gitignore`, шаблон — `.env.example`.
- **Провайдер один — OpenAI-совместимый API.** Yandex AI Studio к нему совместим
  (`https://llm.api.cloud.yandex.net`, модель `gpt://<каталог>/yandexgpt/latest`,
  ключ уходит в `Authorization: Bearer`), отдельный клиент не нужен.
- **Словари — не модель.** Перевод одиночных слов и толкования идут во внешние словари
  (`src/utils/dictClient.ts`, ключ Яндекс.Словаря в `useDictSettings`); модель дороже
  и медленнее. Раскрытие карточки бесплатно, LLM-пояснение — только по кнопке.
- **Dev-сервер перезапускать при новых модулях в content script.** @crxjs прописывает граф
  импортов в манифест при старте; иначе content script падает с
  `Failed to fetch dynamically imported module`. Два `vite` на один `dist/` — гарантированно
  битая сборка.

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
