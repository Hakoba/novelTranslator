# Erudit

Браузерное расширение (Manifest V3, Chrome + Firefox) для чтения англоязычных новелл.
Разбирает текст главы через локальную LLM и показывает сложные слова и фразы уровня B1
с переводом на русский; найденные слова подсвечиваются прямо в тексте страницы.

Работает только на сайтах из списка разрешённых — по умолчанию `reddit.com`.

## Что уже работает

- **Разбор главы.** Оверлей собирает читаемый текст страницы, отправляет в модель и
  показывает список «слово — перевод»; по клику подтягивается пояснение к слову.
- **Подсветка.** Найденные слова и фразы подсвечиваются в тексте главы.
- **Своя модель.** Адрес, имя модели и ключ API задаются в настройках. Подходит любой сервер
  с OpenAI-совместимым API: LM Studio, Ollama, llama.cpp, Yandex AI Studio.
- **Список сайтов.** Правится в popup и в настройках, синхронизируется через `storage.sync`.
- **Тема.** Светлая/тёмная, запоминается между сессиями.

## Чего пока нет

- Словарь сохранённых слов (кнопка «в словарь» в оверлее пока ничего не делает)
- Перевод выделенного текста через Яндекс.Переводчик
- Экспорт словаря в Anki

## Модель

Нужен сервер с OpenAI-совместимым API, отвечающий на `POST {baseUrl}/v1/chat/completions`.
Всё задаётся в настройках расширения:

| | Адрес | Модель | Ключ |
| --- | --- | --- | --- |
| Локально | `http://localhost:1234` | `gpt-oss` | не нужен |
| Yandex AI Studio | `https://llm.api.cloud.yandex.net` | `gpt://<каталог>/yandexgpt/latest` | ключ сервисного аккаунта |

В настройках есть кнопки-пресеты для обоих вариантов.

## Разработка

```bash
npm install
cp .env.example .env   # ключи Яндекса для dev-сборки, в прод-сборку не попадают
npm run dev:chrome     # dev-сборка Chrome
npm run dev:firefox    # dev-сборка Firefox (watch)
npm run build          # прод-сборка обоих браузеров
npm run typecheck      # vue-tsc --noEmit
npm run lint           # eslint --fix
npm test               # node:test через tsx
```

Расширение загружается из `dist/chrome` (`chrome://extensions` → режим разработчика →
загрузить распакованное) или `dist/firefox` (`about:debugging` → загрузить временное дополнение).

Архитектура и конвенции: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md), [.junie/guidelines.md](.junie/guidelines.md).

Встроенный список уровней CEFR пока только английский. Как добавить свой язык —
[docs/cefr-profiles.md](docs/cefr-profiles.md).

Собрано на основе шаблона [vite-vue3-browser-extension-v3](https://github.com/mubaidr/vite-vue3-browser-extension-v3).

## Лицензия

[GPL-3.0-or-later](LICENSE). Форкать и использовать можно свободно; если распространяете свою
версию — исходники должны быть открыты под той же лицензией.

Встроенный список уровней CEFR (`src/utils/cefr/wordLevels.data.ts`, собирается
`scripts/buildCefrList.mjs`) собран из открытых профилей:

- **CEFR-J Vocabulary Profile 1.5** (A1–B2) © Yukio Tono, Tokyo University of Foreign Studies —
  свободно для исследовательского и коммерческого использования при указании авторства,
  <http://www.cefr-j.org/download.html>;
- **Octanove Vocabulary Profile C1/C2 1.0** © Octanove Labs — [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/),
  <https://github.com/openlanguageprofiles/olp-en-cefrj>.
