import type { WordWithExplanation } from '@/types/words'
import { sendBgFetch } from '@/utils/bgFetch'
import { extractContent, parseWords } from '@/utils/llmParse'
import { getLlmSettings } from '@/composables/useLlmSettings'

export const CONTRACT_PROMPT_WORDS = 'Return ONLY valid JSON array of objects with fields: original: string, translate: string. "original" — оригинальное английское слово/фраза; "translate" — краткий перевод на русский. No markdown, no code fences, no comments, no extra text.'

const SYSTEM_PROMPT = 'You are a helpful assistant for translators.'
const TEMPERATURE = 0.2

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

async function chat(messages: ChatMessage[], signal?: AbortSignal): Promise<string> {
  const { baseUrl, model, apiKey } = await getLlmSettings()
  const url = `${baseUrl.replace(/\/$/, '')}/v1/chat/completions`

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`

  const res = await sendBgFetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model, temperature: TEMPERATURE, messages }),
  }, signal)

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

export async function requestDifficultWords(text: string, signal?: AbortSignal): Promise<WordWithExplanation[]> {
  const content = await chat([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Extract hard-to-translate English words and phrases from the text. For each item return fields: original (the original English word/phrase), translate (short Russian translation). ${CONTRACT_PROMPT_WORDS}` },
    { role: 'user', content: text },
  ], signal)

  return parseWords(content)
}

export async function requestExplanation(target: string, context: string, signal?: AbortSignal): Promise<string> {
  const content = await chat([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: 'Given the provided context text, explain briefly in Russian (1–2 sentences) the meaning/usage/nuance of the given English word or phrase. Return ONLY plain Russian text without quotes, markdown, code fences, or extra commentary.' },
    { role: 'user', content: `Word/Phrase: ${target}` },
    { role: 'user', content: `Context:\n${context}` },
  ], signal)

  return content.trim()
}
