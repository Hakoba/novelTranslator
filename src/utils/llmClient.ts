import type { WordWithExplanation } from '@/types/words'
import { sendBgFetch } from '@/utils/bgFetch'
import { extractContent, parseWords } from '@/utils/llmParse'
import { getLlmSettings } from '@/composables/useLlmSettings'

export const CONTRACT_PROMPT_WORDS = 'Return ONLY valid JSON array of objects with fields: original: string, translate: string. "original" — оригинальное английское слово/фраза; "translate" — краткий перевод на русский. No markdown, no code fences, no comments, no extra text.'

const SYSTEM_PROMPT = 'You are a helpful assistant for translators.'
const TEMPERATURE = 0.2

type ChatMessage = { role: 'system' | 'user'; content: string }

async function chat(messages: ChatMessage[], signal?: AbortSignal): Promise<string> {
  const { baseUrl, model, apiKey } = await getLlmSettings()

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`

  const res = await sendBgFetch(`${baseUrl.replace(/\/$/, '')}/v1/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model, temperature: TEMPERATURE, messages }),
  }, signal)

  if (!res.ok) {
    throw new Error(`LLM HTTP ${res.status}${res.error ? `: ${res.error}` : ''}`)
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
