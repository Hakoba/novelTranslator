# Erudit — Privacy Policy

_Last updated: 2026-09-08. Russian version below / русская версия ниже._

Erudit is a browser extension that highlights words above your language level on the
pages you read, translates them and keeps them in a personal dictionary.

## What the extension collects

**Nothing is collected by the developer.** The extension has no server, no analytics,
no telemetry and no accounts. The developer never receives page content, your
dictionary, your settings or your API keys.

## What leaves your browser

The text of a page is sent **only to services you choose in the extension settings**,
and only from sites where you have allowed the extension to run:

- a language model at the address you configured — your own local server or a cloud
  provider (OpenAI-compatible APIs, Anthropic, Google Gemini) with your own key;
- dictionaries and machine translators you selected (Yandex Dictionary,
  dictionaryapi.dev, MyMemory, Google Translate, Microsoft Edge Translator, Lingva,
  DeepL, Azure Translator, LibreTranslate).

Each of these services processes the text under its own privacy policy. Out of the
box, single words are sent to the Microsoft Edge translator and dictionaryapi.dev; a
language model is used only after you configure one.

The extension never sends anything to the website you are visiting and does not
modify its requests.

## What is stored, and where

- **Dictionary, hidden words, picked page areas** — in the browser's local extension
  storage on this device.
- **Settings and API keys** — in the browser's synced extension storage. If you are
  signed into your browser profile, the browser itself syncs them to your other
  devices. Keys are stored as entered, without encryption beyond what the browser
  provides.
- **Backup files** you export contain everything above, including keys.

Nothing is stored outside your browser. Uninstalling the extension removes its data.

## Permissions

- `storage` — settings and dictionary.
- `tabs` — the address of the active tab, to offer "Allow this site" in the popup
  and to show the word list for the active tab in the side panel.
- `sidePanel` — the word list in Chrome's side panel.
- `scripting` — registers the page script on the sites you granted access to.
- Host access — out of the box only `reddit.com` and the key-free dictionaries
  (api.dictionaryapi.dev and the Edge translator at edge.microsoft.com and api-edge.cognitive.microsofttranslator.com). Every
  other site, translator or model address is granted by **you** when you add it:
  the browser asks each time. The "everywhere except" mode asks once for access to
  all sites, and the extension then additionally stays off on mail, banking,
  government and internal hosts. Access can be revoked on the extension's page in
  `chrome://extensions`.

## Contact

Questions and requests: open an issue at <https://github.com/Hakoba/erudit/issues>.

---

# Erudit — политика приватности

_Обновлено 2026-09-08._

Erudit — расширение браузера, которое подсвечивает на странице слова выше вашего
уровня, переводит их и складывает в личный словарь.

## Что собирает расширение

**Разработчик не собирает ничего.** У расширения нет сервера, аналитики, телеметрии
и аккаунтов. Разработчик не получает ни текст страниц, ни словарь, ни настройки,
ни ключи API.

## Что уходит из браузера

Текст страницы отправляется **только сервисам, которые вы сами выбрали в настройках**,
и только с сайтов, где вы разрешили расширению работать:

- языковой модели по указанному вами адресу — вашему локальному серверу или облачному
  провайдеру (OpenAI-совместимые API, Anthropic, Google Gemini) с вашим ключом;
- словарям и машинным переводчикам, которые вы выбрали (Яндекс.Словарь,
  dictionaryapi.dev, MyMemory, Google Translate, переводчик Microsoft Edge, Lingva,
  DeepL, Azure Translator, LibreTranslate).

Каждый из этих сервисов обрабатывает текст по своей политике. Из коробки отдельные
слова уходят в переводчик Microsoft Edge и dictionaryapi.dev; модель используется только
после того, как вы её настроите.

Посещаемому сайту расширение ничего не отправляет и его запросы не меняет.

## Что и где хранится

- **Словарь, скрытые слова, выбранные области страниц** — в локальном хранилище
  расширения на этом устройстве.
- **Настройки и ключи API** — в синхронизируемом хранилище расширения. Если вы вошли
  в профиль браузера, браузер сам переносит их на другие ваши устройства. Ключи
  хранятся как введены, без шифрования сверх того, что даёт браузер.
- **Файлы резервной копии**, которые вы выгружаете, содержат всё перечисленное,
  включая ключи.

Вне браузера ничего не хранится. Удаление расширения удаляет его данные.

## Разрешения

- `storage` — настройки и словарь.
- `tabs` — адрес активной вкладки: кнопка «Разрешить сайт» в попапе и список слов
  активной вкладки в боковой панели.
- `sidePanel` — список слов в боковой панели Chrome.
- `scripting` — подключение скрипта страницы к сайтам, к которым выдан доступ.
- Доступ к сайтам — из коробки только `reddit.com` и бесключевые словари
  (api.dictionaryapi.dev и переводчик Edge: edge.microsoft.com и api-edge.cognitive.microsofttranslator.com). Каждый
  следующий сайт, переводчик или адрес модели разрешаете **вы** при добавлении:
  браузер спрашивает каждый раз. Режим «везде, кроме» просит доступ ко всем сайтам
  один раз, и расширение дополнительно молчит на почте, в банках, на госуслугах
  и внутренних адресах. Отозвать доступ можно на странице расширения
  в `chrome://extensions`.

## Контакт

Вопросы и запросы: <https://github.com/Hakoba/erudit/issues>.
