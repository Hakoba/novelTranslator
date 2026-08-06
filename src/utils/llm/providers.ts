import { extractContent } from '@/utils/llmParse'

/**
 * Три семейства API: OpenAI-совместимое (оно же LM Studio, Ollama, Yandex AI Studio,
 * OpenRouter, Groq), Anthropic Messages и Google Gemini. Различаются адресом,
 * заголовками и формой запроса — всё остальное общее, поэтому провайдер описывается
 * парой чистых функций: собрать запрос и достать текст из ответа.
 *
 * Без браузерных API — тестируется в node.
 */

export type ProviderId = 'openai' | 'anthropic' | 'gemini'

export interface ChatMessage {
  role: 'system' | 'user'
  content: string
}

export interface ChatCredentials {
  baseUrl: string
  model: string
  apiKey: string
}

export interface ChatRequest {
  url: string
  headers: Record<string, string>
  body: string
}

export interface Provider {
  id: ProviderId
  defaultBaseUrl: string
  defaultModel: string
  /** Куда идти за ключом; пусто у локальных серверов */
  keyUrl?: string
  buildRequest: (messages: ChatMessage[], credentials: ChatCredentials, temperature: number) => ChatRequest
  extractText: (data: unknown) => string
}

const JSON_HEADERS: Record<string, string> = { 'Content-Type': 'application/json' }

function trimUrl(url: string): string {
  return url.replace(/\/$/, '')
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Anthropic и Gemini держат системную инструкцию отдельным полем, а не сообщением */
function splitMessages(messages: ChatMessage[]): { system: string; user: string } {
  return {
    system: messages.filter((item) => item.role === 'system').map((item) => item.content).join('\n'),
    // подряд идущие user-сообщения склеиваем: чередование ролей ждут оба API
    user: messages.filter((item) => item.role === 'user').map((item) => item.content).join('\n\n'),
  }
}

/** Ответ модели длинный — список слов целой главы. Anthropic без лимита запрос не примет */
const MAX_TOKENS = 4096

export const PROVIDERS: Record<ProviderId, Provider> = {
  openai: {
    id: 'openai',
    defaultBaseUrl: 'http://localhost:1234',
    defaultModel: 'gpt-oss',
    buildRequest: (messages, { baseUrl, model, apiKey }, temperature) => ({
      url: `${trimUrl(baseUrl)}/v1/chat/completions`,
      headers: apiKey ? { ...JSON_HEADERS, Authorization: `Bearer ${apiKey}` } : { ...JSON_HEADERS },
      body: JSON.stringify({ model, temperature, messages }),
    }),
    extractText: extractContent,
  },

  anthropic: {
    id: 'anthropic',
    defaultBaseUrl: 'https://api.anthropic.com',
    defaultModel: 'claude-sonnet-5',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    buildRequest: (messages, { baseUrl, model, apiKey }, temperature) => {
      const { system, user } = splitMessages(messages)

      return {
        url: `${trimUrl(baseUrl)}/v1/messages`,
        headers: {
          ...JSON_HEADERS,
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          // без этого заголовка запрос из расширения отбивается CORS-политикой
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model,
          max_tokens: MAX_TOKENS,
          temperature,
          system,
          messages: [{ role: 'user', content: user }],
        }),
      }
    },
    extractText: (data) => {
      if (!isObject(data) || !Array.isArray(data.content)) return ''
      const block = data.content.find((item) => isObject(item) && typeof item.text === 'string')

      return isObject(block) && typeof block.text === 'string' ? block.text : ''
    },
  },

  gemini: {
    id: 'gemini',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com',
    defaultModel: 'gemini-2.5-flash',
    keyUrl: 'https://aistudio.google.com/apikey',
    buildRequest: (messages, { baseUrl, model, apiKey }, temperature) => {
      const { system, user } = splitMessages(messages)

      return {
        // ключ уходит заголовком, а не в query: адреса запросов пишутся в лог
        url: `${trimUrl(baseUrl)}/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        headers: { ...JSON_HEADERS, 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          system_instruction: system ? { parts: [{ text: system }] } : undefined,
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: { temperature },
        }),
      }
    },
    extractText: (data) => {
      if (!isObject(data) || !Array.isArray(data.candidates)) return ''
      const content = isObject(data.candidates[0]) ? data.candidates[0].content : undefined
      const parts = isObject(content) && Array.isArray(content.parts) ? content.parts : []
      const part = parts.find((item) => isObject(item) && typeof item.text === 'string')

      return isObject(part) && typeof part.text === 'string' ? part.text : ''
    },
  },
}

export const PROVIDER_LIST: Provider[] = Object.values(PROVIDERS)

/** Неизвестный идентификатор из старых настроек не должен ронять запрос */
export function getProvider(id: string): Provider {
  return PROVIDERS[id as ProviderId] ?? PROVIDERS.openai
}
