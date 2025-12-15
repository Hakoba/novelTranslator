# План подключения LLM к проекту

Цель: получить из LLM список «сложных слов и фраз» из заданного текста и отобразить их в оверлее главы (ChapterOverlay).

## 1) Бэкенд LLM

- Запуск: локально/в сети поднят OpenAI‑совместимый LLM (например, openai/gpt-oss) по адресу:
  - http://192.168.0.9:1234
- Требование: совместимость с OpenAI API (желательно маршрут /v1/chat/completions). Если сервер использует другой маршрут, см. раздел «Альтернативные эндпоинты».

## 2) Базовый сценарий

- По умолчанию отправляется текст:
  - `Get thrown around until you figure it out.\nA lesson learned through countless times being pinned and twisted on the bed.\nAudin had already subdued Enkrid and, in a deep voice, hummed a tune.\n`
- Просим LLM найти трудные для перевода слова и фразы и вернуть их в JSON-формате.
- Парсим ответ, валидируем данные и маппим к типу WordWithExplanation.
- Показываем результат в ChapterOverlay (уже есть интерфейс списка слов).

## 3) Формат запроса

Предпочтительно использовать OpenAI‑совместимый чат‑эндпоинт:
- POST http://192.168.0.9:1234/v1/chat/completions
- Заголовки: `Content-Type: application/json`, при необходимости `Authorization: Bearer <TOKEN>` (если сервер требует)
- Тело запроса (пример):
```json
{
  "model": "gpt-oss",
  "temperature": 0.2,
  "messages": [
    {"role": "system", "content": "You are a helpful assistant for translators."},
    {"role": "user", "content": "Extract hard-to-translate English words and phrases from the text. Return ONLY valid JSON array with objects: {id: string, text: string, explanation: string}. No extra text."},
    {"role": "user", "content": "Get thrown around until you figure it out.\nA lesson learned through countless times being pinned and twisted on the bed.\nAudin had already subdued Enkrid and, in a deep voice, hummed a tune.\n"}
  ]
}
```

Ожидаемый ответ (фрагмент):
```json
{
  "id": "...",
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "[{\"id\":\"1\",\"text\":\"Get thrown around\",\"explanation\":\"идиома: быть швыряемым, метафора о жизненных испытаниях\"}, ...]"
      }
    }
  ]
}
```

## 4) Контракт данных в UI

- Тип, уже присутствующий в проекте:
  - `WordWithExplanation = { id: string; text: string; explanation?: string }`
- Требуется получить массив `WordWithExplanation[]`.
- Если поле `explanation` отсутствует, заполняем кратким описанием или опускаем отображение пояснения (вёрстка поддерживает условный вывод).

## 5) Интеграция в ChapterOverlay

- Место: `src/content-script/overlay/ChapterOverlay.vue`
- Состояния уже есть: `words`, `isLoading`.
- Добавить метод `fetchDifficultWords(): Promise<void>` с типами и без `as`.
- Вызов: `onMounted(fetchDifficultWords)`.
- Алгоритм:
  1. Установить `isLoading.value = true`.
  2. Вызвать LLM клиент (см. раздел 6) с дефолтным текстом.
  3. Распарсить ответ, провести базовую валидацию объектов.
  4. Заполнить `words.value` результатом.
  5. На ошибке — очистить список и/или показать заглушку.
  6. `finally` → `isLoading.value = false`.

## 6) Клиент LLM (пример)

Ниже — примерный модуль-клиент (типобезопасный минималистичный), который можно разместить как утилиту, либо прямо в компоненте для первого шага (минимальные изменения):

```ts
// Типы ответа (суженный контракт под нас)
export type LlmChoice = { message?: { role?: string; content?: string } };
export type LlmResponse = { choices?: LlmChoice[] };

// Type guards
function hasArray<T>(val: unknown): val is T[] { return Array.isArray(val); }
function isObject(val: unknown): val is Record<string, unknown> { return typeof val === 'object' && val !== null; }

export async function requestDifficultWords(baseUrl: string, model: string, text: string, signal?: AbortSignal): Promise<WordWithExplanation[]> {
  const body = {
    model,
    temperature: 0.2,
    messages: [
      { role: 'system', content: 'You are a helpful assistant for translators.' },
      { role: 'user', content: 'Extract hard-to-translate English words and phrases from the text. Return ONLY valid JSON array with objects: {id: string, text: string, explanation: string}. No extra text.' },
      { role: 'user', content: text }
    ]
  };

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal
  });

  if (!res.ok) {
    throw new Error(`LLM HTTP error ${res.status}`);
  }
  const data: unknown = await res.json();
  if (!isObject(data)) return [];
  const choices = isObject(data) && hasArray<LlmChoice>((data as Record<string, unknown>).choices) ? (data as { choices: LlmChoice[] }).choices : [];
  const content = choices[0]?.message?.content ?? '';

  // Попытка распарсить JSON из content
  let parsed: unknown = [];
  try { parsed = JSON.parse(content); } catch { parsed = []; }

  if (!hasArray<unknown>(parsed)) return [];

  // Валидация и маппинг в WordWithExplanation
  const result: WordWithExplanation[] = parsed
    .filter(isObject)
    .map((o, idx) => {
      const idRaw = o.id;
      const textRaw = o.text;
      const expRaw = o.explanation;
      const id = typeof idRaw === 'string' && idRaw.length > 0 ? idRaw : String(idx + 1);
      const text = typeof textRaw === 'string' ? textRaw : '';
      const explanation = typeof expRaw === 'string' ? expRaw : undefined;
      return text ? { id, text, explanation } : undefined;
    })
    .filter((v): v is WordWithExplanation => Boolean(v));

  return result;
}
```

Примечания:
- Не используем `as Type`; применяем простые type guards.
- Можно вынести константы: BASE_URL, MODEL, DEFAULT_TEXT.

## 7) Константы (предлагаемые)

- BASE_URL: `http://192.168.0.9:1234`
- MODEL: `gpt-oss`
- DEFAULT_TEXT: как в задании

## 8) Подключение в компонент

Пример вызова внутри `ChapterOverlay.vue` (псевдокод шагов):

```ts
import { onMounted, ref } from 'vue';

const BASE_URL = 'http://192.168.0.9:1234';
const MODEL = 'gpt-oss';
const DEFAULT_TEXT = `Get thrown around until you figure it out.\nA lesson learned through countless times being pinned and twisted on the bed.\nAudin had already subdued Enkrid and, in a deep voice, hummed a tune.\n`;

const isLoading = ref<boolean>(false);
const words = ref<WordWithExplanation[]>([]);

async function fetchDifficultWords(): Promise<void> {
  isLoading.value = true;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const items = await requestDifficultWords(BASE_URL, MODEL, DEFAULT_TEXT, controller.signal);
    clearTimeout(timer);
    words.value = items;
  } catch {
    words.value = [];
  } finally {
    isLoading.value = false;
  }
}

onMounted(fetchDifficultWords);
```

## 9) Отображение в ChapterOverlay

Компонент уже поддерживает рендер массива слов через список `<ul>` с `:key`, условный вывод количества и состояния загрузки. После заполнения `words.value` элементы появятся автоматически.

## 10) Обработка ошибок и UX

- Таймаут 15 секунд на запрос, с `AbortController`.
- Если сервер недоступен — показывать «Пока ничего не найдено.» (поведение по умолчанию компонента), можно добавить всплывающую подсказку в будущем.
- Логи и `console.log` не добавлять в прод; при отладке — временно и с очисткой перед коммитом.

## 11) Альтернативные эндпоинты (если не OpenAI‑совместимый)

Если сервер не поддерживает `/v1/chat/completions`, уточнить документацию сервера. Частые варианты:
- `/v1/completions` (prompt вместо messages)
- `/completion` (LLama.cpp server)

Тело запроса в этом случае формируем строковым промптом и парсим `response`/`content` поля. Требование вернуть ЧИСТЫЙ JSON остаётся.

## 12) Проверка и отладка

1. Убедиться, что хост 192.168.0.9 доступен из браузера, где работает расширение.
2. Открыть страницу с контент‑скриптом, увидеть оверлей.
3. На первой загрузке должен отработать запрос и подставиться список сложных слов.
4. При недоступности сервера — пустой результат без падений.

## 13) Дальнейшие улучшения (после MVP)

- Вынос клиента LLM в отдельный модуль utils с юнит‑тестом type guards.
- Поддержка пользовательского текста (выделение на странице → анализ).
- Параметризация BASE_URL/модели через настройки расширения.
- Отображение источника фразы (контекст/предложение).
- Дедупликация и сортировка по сложности.
