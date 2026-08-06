# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repository.

## Project Overview

**Erudit** — браузерное расширение (Manifest V3, Chrome + Firefox) для чтения
англоязычных текстов: собирает текст страницы, прогоняет через LLM, показывает сложные
слова и фразы выше уровня читателя с переводом и пояснением, подсвечивает их на странице
и складывает в словарь. Работает только на сайтах из списка разрешённых
(по умолчанию `reddit.com`).

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
- **Провайдеры модели — чистые функции, а не клиенты.** `utils/llm/providers.ts` описывает
  каждый вид API парой «собрать запрос / достать текст», транспорт общий (`bgFetch`), тесты
  идут в node. OpenAI-совместимые облака (Yandex AI Studio, OpenRouter, Groq, DeepSeek,
  Mistral) — кнопки-пресеты, новый провайдер заводится только под чужой формат запроса.
- **Настройки — четыре подраздела, а не один экран.** Новая настройка идёт в свой раздел
  (`ui/options-page/pages/`): чтение — `index.vue`, подключение модели — `model.vue`,
  словари и переводчики — `dictionaries.vue`, список сайтов — `sites.vue`. Роутинг
  file-based: новый файл в `pages/` сам становится роутом.
- **Никаких строк интерфейса в коде.** Тексты — в `src/locales/*.ts` (эталон — `en.ts`,
  он же fallback), в компонентах `useI18n`, вне компонентов — `t` из `utils/i18n.ts`.
  Новый ключ добавляется во все локали сразу — иначе `locales.test.ts` покраснеет. Модули,
  которые тестируются в node (`anki.ts`), бросают код ошибки, а не текст: локали им
  недоступны. Формы числительных: русскому нужно три (свои `pluralRules`), европейским
  хватает двух, у китайского и корейского ветки `|` просто нет.
- **Язык текста и язык интерфейса — разные настройки.** Пара «читаю на / перевод на»
  живёт в `useReaderSettings` и уходит в промпты, в словари и в ссылки; `uiLang` там же,
  но список языков интерфейса свой и короче (`UI_LANGUAGE_CODES` в `utils/languages.ts`,
  там же `defaultUiLanguage` — язык браузера с откатом в английский).
- **`cefr/wordLevels.data.ts` руками не правится** — файл собирается
  `scripts/buildCefrList.mjs` из открытых профилей (CEFR-J и Octanove), атрибуция
  обязательна и живёт в README. Грузится динамическим импортом (путь только статический,
  иначе @crxjs не пропишет чанк в манифест): 75 КБ незачем держать в content script
  на каждой странице. Профиль для нового языка — `docs/cefr-profiles.md`.
- **Карточка слова — одна на всё.** Подсказка при наведении и панель выделения — это
  `overlay/components/WordCard.vue`; данные для неё собираются из живых списков слов
  и словаря, а не из атрибутов `<mark>`: подсветка несёт только цвет и текст. Запрос
  в словари внутри карточки отложен на 400 мс — курсор пробегает по словам мимоходом.
- **Переход внутри SPA ловится опросом адреса** (`content-script/index.ts`). Content script
  запускается один раз на загрузку документа, а reddit и читалки меняют страницу без неё —
  без этого оверлей остаётся с разбором предыдущей. Своего события нет: Navigation API есть
  не во всех браузерах, `pushState` сайта из изолированного мира не виден, `webNavigation`
  стоит лишнего разрешения при проверке в сторе. Смена `origin+pathname` меняет ключ
  у `ChapterOverlay`, и он пересоздаётся; разбор ждёт `CONTENT_SETTLE_MS` — сразу после
  смены адреса текст на странице ещё прошлый.
- **Разбирается дописанное, а не страница целиком.** Читалки догружают главу хвостом
  к прежней: `useDifficultWords` держит текст прошлого разбора на уровне модуля (переживает
  пересоздание оверлея) и отдаёт в `analyzeText` только `appendedTail`. Поэтому `joinBlocks`
  текст не обрезает — обрезка отдельным `limitChars` уже после сравнения: она режет с конца,
  и на выросшей странице новая глава в запрос иначе не попадала бы вовсе.
- **Словари — не модель.** Перевод одиночных слов и толкования идут во внешние словари
  (`src/utils/dictClient.ts`, ключ Яндекс.Словаря в `useDictSettings`); модель дороже
  и медленнее. Раскрытие карточки бесплатно, LLM-пояснение — только по кнопке.
- **Расширение работает сразу после установки, без ключей.** Кто ищет слова, решает
  `readerSettings.engine`: `dictionary` (по умолчанию) отбирает их офлайн-профилем CEFR
  и переводит словарём, `llm` зовёт модель. Развилка одна — `utils/analyze.ts`, её и
  правим; звать модель из ветки `dictionary` нельзя (для этого у `translateTerm`
  выделен `dictTranslate` без модели). Профиль собран только по английскому.
- **Ключ Яндекс.Словаря — единственный, который идёт в прод-сборку** (`YANDEX_DICT_KEY`):
  он бесплатный, с суточной квотой на всех, и нужен, чтобы перевод работал до всякой
  настройки. Ключи модели остаются в dev. Условия сервиса требуют подписи с активной
  ссылкой везде, где показаны его данные, — `lookup.yandexAttribution`.
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
