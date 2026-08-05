import type { WordWithExplanation } from '@/types/words'
import { sendBgFetch } from '@/utils/bgFetch'
import { extractContent, parseWords } from '@/utils/llmParse'
import { getLlmSettings } from '@/composables/useLlmSettings'
import { getReaderSettings } from '@/composables/useReaderSettings'

export const CONTRACT_PROMPT_WORDS = 'Return ONLY valid JSON array of objects with fields: original: string, translate: string, level: string. "original" — оригинальное английское слово/фраза; "translate" — краткий перевод на русский; "level" — уровень CEFR ровно одним из значений A1, A2, B1, B2, C1, C2. No markdown, no code fences, no comments, no extra text.'

const SYSTEM_PROMPT = 'You are a helpful assistant for translators.'
const TEMPERATURE = 0.2

/** Локальные модели на CPU думают минуту и дольше: 15 секунд обрывали живой запрос */
export const REQUEST_TIMEOUT_MS = 90000

type ChatMessage = { role: 'system' | 'user'; content: string }

/** Сообщение должно называть причину и место, куда лезть, — иначе «HTTP 401» ни о чём не говорит */
function describeError(status: number, host: string, error?: string): string {
  if (status === 401 || status === 403) {
    return `${host} отклонил ключ API (${status}). Проверьте ключ и имя модели в настройках расширения.`
  }
  if (status === 404) {
    return `${host} не знает такой эндпоинт или модель (404). Проверьте адрес и имя модели.`
  }
  if (status === 0) {
    return `Не удалось подключиться к ${host}${error ? `: ${error}` : ''}. Сервер модели запущен?`
  }

  return `${host} ответил ошибкой ${status}${error ? `: ${error}` : ''}`
}

/** Таймаут живёт здесь: у вызывающих нет других причин прерывать запрос */
async function chat(messages: ChatMessage[]): Promise<string> {
  const { baseUrl, model, apiKey } = await getLlmSettings()
  const url = `${baseUrl.replace(/\/$/, '')}/v1/chat/completions`

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  const res = await sendBgFetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model, temperature: TEMPERATURE, messages }),
  }, controller.signal).finally(() => clearTimeout(timer))

  if (!res.ok) {
    let host = baseUrl
    try {
      host = new URL(baseUrl).host
    } catch {
      // адрес из настроек может быть кривым — тогда показываем как есть
    }
    throw new Error(describeError(res.status, host, res.error))
  }

  return extractContent(res.data)
}

export async function requestDifficultWords(text: string): Promise<WordWithExplanation[]> {
  const { level } = await getReaderSettings()

  const content = await chat([
    { role: 'system', content: SYSTEM_PROMPT },
    // порог уровня задаётся здесь, а не фильтром на клиенте: так модель не тратит токены на заведомо лишнее
    { role: 'user', content: `The reader's English level is ${level}. Extract hard-to-translate English words and phrases from the text, but ONLY those above ${level} — skip everything a ${level} reader already knows. ${CONTRACT_PROMPT_WORDS}` },
    { role: 'user', content: text },
  ])

  return parseWords(content)
}

/** Перевод одной выделенной фразы. Контракт тот же, что у списка слов, — массив из одного элемента */
export async function requestTranslation(
  target: string,
  context: string,
): Promise<WordWithExplanation | undefined> {
  const content = await chat([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Translate the given English word or phrase into Russian, using the context to pick the right meaning. Return exactly one object in the array. ${CONTRACT_PROMPT_WORDS}` },
    { role: 'user', content: `Word/Phrase: ${target}` },
    { role: 'user', content: `Context:\n${context}` },
  ])

  return parseWords(content)[0]
}

export async function requestExplanation(target: string, context: string): Promise<string> {
  const content = await chat([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: 'Given the provided context text, explain briefly in Russian (1–2 sentences) the meaning/usage/nuance of the given English word or phrase. Return ONLY plain Russian text without quotes, markdown, code fences, or extra commentary.' },
    { role: 'user', content: `Word/Phrase: ${target}` },
    { role: 'user', content: `Context:\n${context}` },
  ])

  return content.trim()
}
