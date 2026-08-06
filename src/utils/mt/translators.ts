/**
 * Машинный перевод фраз: дешевле и быстрее модели, но без уровня CEFR и пояснений.
 * Сборка запроса и разбор ответа — чистые функции, транспорт общий (`bgFetch`).
 */

export type TranslatorId = 'none' | 'deepl' | 'libre'

export interface TranslatorCredentials {
  /** Свой сервер LibreTranslate; у DeepL адрес выбирается по виду ключа */
  baseUrl: string
  apiKey: string
}

export interface TranslateRequest {
  url: string
  headers: Record<string, string>
  body: string
}

export interface Translator {
  id: Exclude<TranslatorId, 'none'>
  title: string
  keyUrl: string
  /** DeepL берёт ключ обязательно, публичные серверы LibreTranslate — не всегда */
  requiresKey: boolean
  buildRequest: (text: string, source: string, target: string, credentials: TranslatorCredentials) => TranslateRequest
  extractText: (data: unknown) => string
}

const JSON_HEADERS: Record<string, string> = { 'Content-Type': 'application/json' }

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function trimUrl(url: string): string {
  return url.replace(/\/$/, '')
}

/** Ключи бесплатного тарифа DeepL оканчиваются на `:fx` и ходят на другой домен */
export function deeplBaseUrl(apiKey: string): string {
  return apiKey.trim().endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com'
}

/**
 * DeepL требует региональный вариант там, где язык не один: EN и PT как цель
 * без региона он не принимает. Источник, наоборот, региона не терпит.
 */
const DEEPL_TARGETS: Record<string, string> = { en: 'EN-US', pt: 'PT-PT' }

export function deeplTarget(code: string): string {
  return DEEPL_TARGETS[code] ?? code.toUpperCase()
}

export const TRANSLATORS: Record<Exclude<TranslatorId, 'none'>, Translator> = {
  deepl: {
    id: 'deepl',
    title: 'DeepL',
    keyUrl: 'https://www.deepl.com/pro-api',
    requiresKey: true,
    buildRequest: (text, source, target, { apiKey }) => ({
      url: `${deeplBaseUrl(apiKey)}/v2/translate`,
      headers: { ...JSON_HEADERS, Authorization: `DeepL-Auth-Key ${apiKey}` },
      body: JSON.stringify({
        text: [text],
        source_lang: source.toUpperCase(),
        target_lang: deeplTarget(target),
      }),
    }),
    extractText: (data) => {
      if (!isObject(data) || !Array.isArray(data.translations)) return ''
      const first = data.translations[0]

      return isObject(first) && typeof first.text === 'string' ? first.text : ''
    },
  },

  libre: {
    id: 'libre',
    title: 'LibreTranslate',
    keyUrl: 'https://portal.libretranslate.com',
    requiresKey: false,
    buildRequest: (text, source, target, { baseUrl, apiKey }) => ({
      url: `${trimUrl(baseUrl)}/translate`,
      headers: { ...JSON_HEADERS },
      body: JSON.stringify({
        q: text,
        source,
        target,
        format: 'text',
        api_key: apiKey || undefined,
      }),
    }),
    extractText: (data) =>
      isObject(data) && typeof data.translatedText === 'string' ? data.translatedText : '',
  },
}

export const TRANSLATOR_LIST: Translator[] = Object.values(TRANSLATORS)

export function getTranslator(id: string): Translator | undefined {
  return id === 'deepl' || id === 'libre' ? TRANSLATORS[id] : undefined
}
