# Copilot AI Agent Instructions

## Project Overview

- Erudit — расширение (Manifest V3, Chrome + Firefox): разбирает главу
  англоязычной новеллы через локальную LLM и показывает сложные слова с переводом.
- Контексты: background, content script (оверлей), popup, options, setup, devtools, offscreen.
- Состояние — Pinia и composables поверх `chrome.storage`; браузерные API — `webextension-polyfill`.
- UI — PrimeVue + Tailwind CSS 4, компоненты автоимпортируются, иконки `lucide-vue-next`.

## Key Workflows

- **Development**: `npm run dev` (Chrome и Firefox параллельно)
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Typecheck**: `npm run typecheck`
- **Tests**: `npm test` (node:test через tsx)
- **Load extension**: `dist/chrome` или `dist/firefox`

## Architecture & Patterns

- **File-based routing**: страницы — в `src/ui/<context>/pages/`, инициализация — `createPage`.
- **Composables**: общая логика в `src/composables/` (storage, настройки LLM, тема, сайты).
- **Shadow DOM**: оверлей рендерится в shadow root, глобальный CSS в документ сайта не попадает.
- **LLM через background**: запросы идут `bgFetch` → service worker, иначе mixed content.
- **TypeScript строгий**, без `as` — только type guards.
- **Логи**: `console.info` в background и content script.

## Integration Points

- **Browser APIs**: `webextension-polyfill`
- **UI**: PrimeVue (единственная библиотека компонентов)
- **LLM**: любой OpenAI-совместимый сервер, адрес и модель — в настройках расширения

## Examples

- `src/background/index.ts` — install/update и прокси fetch
- `src/content-script/index.ts` — монтирование оверлея в Shadow DOM
- `src/utils/llmParse.ts` — разбор ответа модели (и тест рядом)
- `src/ui/options-page/pages/index.vue` — страница настроек

## References

- Архитектура и решения: [docs/DEVELOPMENT.md](../docs/DEVELOPMENT.md)
- Состояние фич: [docs/projectInfo.md](../docs/projectInfo.md)
- Конвенции кода: [.junie/guidelines.md](../.junie/guidelines.md)
