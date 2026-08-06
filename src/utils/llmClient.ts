import type { WordWithExplanation } from '@/types/words'
import { sendBgFetch } from '@/utils/bgFetch'
import { parseWords } from '@/utils/llmParse'
import { getProvider, type ChatMessage } from '@/utils/llm/providers'
import { t } from '@/utils/i18n'
import { getLlmSettings } from '@/composables/useLlmSettings'
import { getReaderSettings, PROMPT_EXTRA_LIMIT } from '@/composables/useReaderSettings'
import { languageName } from '@/utils/languages'
import { reviewWords } from '@/utils/cefr/levels'

/** Контракт ответа — наш, добавка читателя его не касается: иначе разбор ответа развалится */
export function contractPrompt(target: string): string {
  return `Return ONLY valid JSON array of objects with fields: original: string, translate: string, level: string. "original" — the word or phrase exactly as it appears in the text; "translate" — a short translation into ${target}; "level" — CEFR level, exactly one of A1, A2, B1, B2, C1, C2. No markdown, no code fences, no comments, no extra text.`
}

const SYSTEM_PROMPT = 'You are a helpful assistant for translators.'

/** Уточнение читателя идёт в system-сообщение после наших правил и обрезается по лимиту поля */
function systemPrompt(extra: string): string {
  const trimmed = extra.trim().slice(0, PROMPT_EXTRA_LIMIT)

  return trimmed ? `${SYSTEM_PROMPT}\nThe reader adds: ${trimmed}` : SYSTEM_PROMPT
}
const TEMPERATURE = 0.2

/** Локальные модели на CPU думают минуту и дольше: 15 секунд обрывали живой запрос */
export const REQUEST_TIMEOUT_MS = 90000

/** Сообщение должно называть причину и место, куда лезть, — иначе «HTTP 401» ни о чём не говорит */
function describeError(status: number, host: string, error?: string): string {
  if (status === 401 || status === 403) return t('errors.keyRejected', { host, status })
  if (status === 404) return t('errors.notFound', { host })
  if (status === 0) {
    return error ? t('errors.unreachableWith', { host, error }) : t('errors.unreachable', { host })
  }

  return error
    ? t('errors.httpStatusWith', { host, status, error })
    : t('errors.httpStatus', { host, status })
}

/** Таймаут живёт здесь: у вызывающих нет других причин прерывать запрос */
async function chat(messages: ChatMessage[]): Promise<string> {
  const { provider, baseUrl, model, apiKey } = await getLlmSettings()
  const adapter = getProvider(provider)
  const { url, headers, body } = adapter.buildRequest(messages, { baseUrl, model, apiKey }, TEMPERATURE)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  const res = await sendBgFetch(url, {
    method: 'POST',
    headers,
    body,
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

  return adapter.extractText(res.data)
}

/** Ping из настроек: одним коротким запросом проверяет адрес, ключ и имя модели */
export async function checkModel(): Promise<void> {
  await chat([{ role: 'user', content: 'ping' }])
}

export async function requestDifficultWords(text: string): Promise<WordWithExplanation[]> {
  const { level, sourceLang, targetLang, promptExtra } = await getReaderSettings()
  const source = languageName(sourceLang)

  const content = await chat([
    { role: 'system', content: systemPrompt(promptExtra) },
    // порог уровня задаётся здесь, а не фильтром на клиенте: так модель не тратит токены на заведомо лишнее
    { role: 'user', content: `The reader's ${source} level is ${level}. Extract hard-to-translate ${source} words and phrases from the text, but ONLY those above ${level} — skip everything a ${level} reader already knows. ${contractPrompt(languageName(targetLang))}` },
    { role: 'user', content: text },
  ])

  // список — страховка: модель регулярно тащит в ответ слова заметно ниже порога,
  // а офлайн-профиль про английский знает не хуже неё (только без контекста)
  return sourceLang === 'en' ? reviewWords(parseWords(content), level) : parseWords(content)
}

/** Перевод одной выделенной фразы. Контракт тот же, что у списка слов, — массив из одного элемента */
export async function requestTranslation(
  target: string,
  context: string,
): Promise<WordWithExplanation | undefined> {
  const { sourceLang, targetLang, promptExtra } = await getReaderSettings()

  const content = await chat([
    { role: 'system', content: systemPrompt(promptExtra) },
    { role: 'user', content: `Translate the given ${languageName(sourceLang)} word or phrase into ${languageName(targetLang)}, using the context to pick the right meaning. Return exactly one object in the array. ${contractPrompt(languageName(targetLang))}` },
    { role: 'user', content: `Word/Phrase: ${target}` },
    { role: 'user', content: `Context:\n${context}` },
  ])

  return parseWords(content)[0]
}

export async function requestExplanation(target: string, context: string): Promise<string> {
  const { sourceLang, targetLang, promptExtra } = await getReaderSettings()
  const answerLang = languageName(targetLang)

  const content = await chat([
    { role: 'system', content: systemPrompt(promptExtra) },
    { role: 'user', content: `Given the provided context text, explain briefly in ${answerLang} (1–2 sentences) the meaning/usage/nuance of the given ${languageName(sourceLang)} word or phrase. Return ONLY plain ${answerLang} text without quotes, markdown, code fences, or extra commentary.` },
    { role: 'user', content: `Word/Phrase: ${target}` },
    { role: 'user', content: `Context:\n${context}` },
  ])

  return content.trim()
}
