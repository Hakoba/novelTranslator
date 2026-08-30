# Developer Guide

## Архитектура

- **Контексты расширения**: background (service worker), content script, popup, options, setup,
  side-panel (боковая панель Chrome), devtools, offscreen.
- **File-based routing**: маршруты страниц автоматически собираются из `src/ui/*/pages`.
- **UI**: PrimeVue (единственная UI-библиотека) + Tailwind CSS 4. Компоненты PrimeVue
  автоимпортируются через `PrimeVueResolver`, тема — Aura, переключение по классу `.dark`.
- **Состояние**: Pinia + composables поверх `chrome.storage` (`useBrowserStorage`).
- **WebExtension API**: `webextension-polyfill` (promise-стиль, кроссбраузерно).

## Структура

- `src/assets/` — глобальные стили страниц расширения (`base.css`) и логотип
- `src/background/` — service worker: install/update, прокси fetch к LLM
- `src/components/` — общие Vue-компоненты (список сайтов, переключатель темы)
- `src/composables/` — storage, список сайтов, настройки LLM, тема, разбор страницы
- `src/content-script/` — оверлей на странице: Shadow DOM, стили, компоненты оверлея
- `src/ui/<context>/` — точки входа страниц (`index.ts`, `app.vue`, `pages/`)
- `src/utils/` — LLM-клиент и парсер ответов, мост в background, подсветка, роутер, pinia
- `src/types/` — ручные типы и файлы, генерируемые плагинами (не редактировать)

## Ключевые решения

- **Оверлей живёт в Shadow DOM.** В документ сайта не попадает ни строчки нашего CSS:
  стили оверлея инлайнятся в shadow root (`overlay.css?inline`), стили PrimeVue зеркалятся
  из `document.head` (`mirrorStyles.ts`), подсветка слов ставится инлайном на элемент.
- **Запросы к LLM идут через background.** Content script на https-странице не может
  обратиться к http-адресу локальной модели, service worker — может (`bgFetch`).
- **Ответ модели парсится терпимо**: markdown-фенсы и текст вокруг JSON отбрасываются
  (`llmParse.ts`).
- **PrimeVue Dialog не годится для оверлея** — он рендерится в `document.body`, вне shadow root.
- **Список слов в Chrome — в боковой панели браузера** (`chrome.sidePanel`,
  `src/ui/side-panel/`): вьюпорт ужимает сам браузер, вёрстка сайта не трогается.
  Оверлей публикует снимок состояния и принимает команды (`utils/panelBus.ts`,
  `content-script/panelBridge.ts`); Firefox пока остаётся с доком в странице —
  развилка по build-флагу `__HAS_SIDE_PANEL__`.

## Конвенции

- Строгий TypeScript: типы у `ref`/`computed`, return-типы функций, никаких `as` — только
  type guards. Полный список: `.junie/guidelines.md`.
- `<script setup>`, порядок блоков: props → composables → state → computed → watchers →
  lifecycle → методы.
- Семантическая вёрстка: списки — `ul/li`, кнопки — `button` (или `Button` PrimeVue),
  у иконочных кнопок обязателен `aria-label`.
- Новые страницы — в `src/ui/<context>/pages/`, общая инициализация — `createPage`.
- Логика с ветвлениями выносится в модуль без браузерных API и покрывается тестом
  (`node:test` + `tsx`, файлы `*.test.ts` рядом с кодом).

## Проверки

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

Проверять расширение нужно и в Chrome, и в Firefox: сборки собираются раздельно.
