import type { WordWithExplanation } from '@/types/words'
import { sendBgFetch } from '@/utils/bgFetch'
import { extractContent, parseWords } from '@/utils/llmParse'

export const BASE_URL = 'http://192.168.0.17:1234'
export const MODEL = 'gpt-oss'
export const DEFAULT_TEXT = 'Get thrown around until you figure it out.\nA lesson learned through countless times being pinned and twisted on the bed.\nAudin had already subdued Enkrid and, in a deep voice, hummed a tune.\n'
export const CONTRACT_PROMPT_WORDS = 'Return ONLY valid JSON array of objects with fields: original: string, translate: string. "original" — оригинальное английское слово/фраза; "translate" — краткий перевод на русский. No markdown, no code fences, no comments, no extra text.'

// Минимальный контракт LLM-ответа
export type LlmChoice = { message?: { role?: string; content?: string } }
export type LlmResponse = { choices?: LlmChoice[] }

export async function requestDifficultWords(text: string, signal?: AbortSignal): Promise<WordWithExplanation[]> {
  const body = {
    model: MODEL,
    temperature: 0.2,
    messages: [
      { role: 'system', content: 'You are a helpful assistant for translators.' },
      { role: 'user', content: `Extract hard-to-translate English words and phrases from the text. For each item return fields: original (the original English word/phrase), translate (short Russian translation). ${CONTRACT_PROMPT_WORDS}` },
      { role: 'user', content: text },
    ],
  }

  const res = await sendBgFetch(`${BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, signal)

  if (!res.ok) {
    throw new Error(`LLM HTTP ${res.status}${res.error ? `: ${res.error}` : ''}`)
  }
  return parseWords(extractContent(res.data))
}

export async function requestExplanation(target: string, context: string, signal?: AbortSignal): Promise<string> {
  const body = {
    model: MODEL,
    temperature: 0.2,
    messages: [
      { role: 'system', content: 'You are a helpful assistant for translators.' },
      { role: 'user', content: 'Given the provided context text, explain briefly in Russian (1–2 sentences) the meaning/usage/nuance of the given English word or phrase. Return ONLY plain Russian text without quotes, markdown, code fences, or extra commentary.' },
      { role: 'user', content: `Word/Phrase: ${target}` },
      { role: 'user', content: `Context:\n${context}` },
    ],
  }

  const res = await sendBgFetch(`${BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, signal)

  if (!res.ok) {
    throw new Error(`LLM HTTP ${res.status}${res.error ? `: ${res.error}` : ''}`)
  }
  return extractContent(res.data).trim()
}
