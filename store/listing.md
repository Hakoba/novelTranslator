# Карточка в Chrome Web Store

Тексты и ответы для формы публикации. Обновлять при смене разрешений или источников.

## Краткое описание (≤ 132 символа)

Сложные слова любой страницы с переводом: подсветка, словарь и тренировка.

## Подробное описание

Erudit читает страницу вместе с вами и подсвечивает только те слова и фразы, которые
выше вашего уровня английского. Текст остаётся нетронутым — не переводится целиком
и не превращается в словарь по клику.

Что умеет:
• Подсветка слов выше вашего уровня CEFR (A1–C2) с переводом при наведении.
• Список найденных слов в боковой панели браузера — сохранить в словарь одним кликом.
• Словарь с тренировкой по интервалам (1, 3, 7, 16, 35, 90 дней), экспорт и импорт Anki.
• Подмена слов: на страницах на родном языке изучаемые слова вплетаются в текст.
• Перевод выделенного текста — слова и фразы.
• Работает сразу после установки: без регистрации, ключей и оплаты. Слова отбирает
  встроенный офлайн-профиль CEFR, переводит словарь.
• Хотите больше — подключите языковую модель: свою локальную (LM Studio, Ollama)
  или облачную по своему ключу (OpenAI, Anthropic, Gemini, Yandex, OpenRouter, Groq,
  DeepSeek, Mistral). Модель видит контекст, находит фразы и объясняет их.
• Работает только на сайтах, которые вы разрешили. По умолчанию — reddit.com.

Приватность: у расширения нет сервера, аналитики и аккаунтов. Текст страницы уходит
только сервисам, которые вы выбрали сами. Ключи хранятся в браузере и никуда не уезжают.

Открытый исходный код: https://github.com/Hakoba/erudit
Как настроить: https://github.com/Hakoba/erudit/blob/master/docs/SETUP.md
Вопросы и поддержка: https://t.me/erudit_extension

## Категория

Productivity → Education (или Tools). Язык карточки — русский, интерфейс расширения
переведён на английский, испанский, португальский, китайский и корейский.

## Ссылки

- Политика приватности: https://github.com/Hakoba/erudit/blob/master/docs/PRIVACY.md
- Сайт (homepage): https://github.com/Hakoba/erudit
- Поддержка (support URL): https://t.me/erudit_extension

## Единственное назначение (single purpose)

Помощь в чтении иностранных текстов: подсветка и перевод слов выше уровня читателя
с ведением личного словаря.

## Обоснование разрешений

- **storage** — настройки, словарь, скрытые слова, выбранные области страниц.
- **tabs** — адрес активной вкладки: кнопка «Разрешить сайт» в попапе и список слов
  активной вкладки в боковой панели. Содержимое вкладок через это API не читается.
- **sidePanel** — список найденных слов живёт в боковой панели Chrome.
- **scripting** — регистрация content script на сайтах, к которым пользователь
  выдал доступ (`scripting.registerContentScripts`).
- **Host permissions** — статически только `reddit.com` (сайт по умолчанию)
  и бесключевые словари: api.dictionaryapi.dev и переводчик Edge
  (edge.microsoft.com, api-edge.cognitive.microsofttranslator.com). Остальное — `optional_host_permissions: <all_urls>`:
  каждый сайт, переводчик или адрес модели пользователь разрешает сам, браузер
  спрашивает при добавлении. Режим «везде, кроме» просит доступ ко всем сайтам
  один раз; почта, банки, госуслуги и внутренние хосты исключены всегда.
- **Удалённый код** — не используется. Все скрипты и WebAssembly (sql.js для экспорта
  в Anki) входят в пакет.

## Обоснование разрешений — по-английски (для формы Privacy)

**Single purpose**

Erudit helps read foreign-language pages: it highlights words above the reader's
level, translates them and keeps them in a personal dictionary for spaced practice.

**storage**

Stores user settings (level, language pair, allowed sites, API keys the user
entered) and the personal dictionary with practice progress. Nothing is sent to the
developer.

**tabs**

Used to read the URL of the active tab: the popup offers "Allow this site" for the
current domain, and the side panel shows the word list of the active tab and
switches when the user changes tabs. Page content is never read through this API.

**sidePanel**

The list of found words lives in Chrome's side panel. The panel is opened only by
a user gesture (popup button, on-page button or keyboard shortcut).

**scripting**

Registers the content script on the sites the user has granted access to
(`scripting.registerContentScripts`). Nothing is injected on other sites.

**Host permissions**

Declared statically only for the default site (reddit.com) and the key-free
dictionary services used out of the box: api.dictionaryapi.dev and the Edge translator
(edge.microsoft.com, api-edge.cognitive.microsofttranslator.com).
Everything else is under `optional_host_permissions`:
when the user adds a site, picks another translator or sets a model address, the
extension calls `permissions.request` for that origin only, and the browser asks
the user. The "everywhere except" mode requests access to all sites once; mail,
banking, government and intranet hosts are always excluded there. The page text is
sent only to translation or language-model services the user has chosen; there is
no developer server.

**Remote code**

No remote code is used. All scripts and the WebAssembly module (sql.js, used for
Anki export) are bundled in the package.

## Раскрытие данных (Data usage)

Расширение собирает или передаёт:

- **Website content** — текст открытой страницы отправляется сервисам перевода
  и языковой модели, которые выбрал пользователь. Разработчику не передаётся.
- **Authentication information** — ключи API сторонних сервисов хранятся в браузере
  пользователя (chrome.storage.sync) и отправляются только тем сервисам, которым
  принадлежат. Разработчику не передаются.

Не собирает: персональные данные, здоровье, финансы, переписку, историю, активность.

Подтверждения: данные не продаются третьим лицам; используются только для основной
функции; не используются для оценки кредитоспособности и кредитования.

## Материалы

- Иконка 128×128 — `store/icon-128.png` (из `src/assets/logo.png`).
- Скриншоты 1280×800 (до пяти): страница с подсветкой и открытой боковой панелью,
  карточка слова при наведении, словарь, тренировка, настройки «Чтение». Снять руками.
- Промо-плитка 440×280 — по желанию.
- Пакет — `dist/chrome-<версия>.zip`, собирается `npm run build:chrome`.
