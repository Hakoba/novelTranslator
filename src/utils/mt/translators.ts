/**
 * Машинный перевод фраз: дешевле и быстрее модели, но без уровня CEFR и пояснений.
 * Сборка запроса и разбор ответа — чистые функции, транспорт общий (`bgFetch`).
 */

export type TranslatorId =
  | 'none'
  | 'yandex'
  | 'mymemory'
  | 'google'
  | 'edge'
  | 'lingva'
  | 'deepl'
  | 'azure'
  | 'libre'

/**
 * Яндекс.Словарь стоит в списке источников наравне с переводчиками, но адаптера здесь
 * нет: он живёт в `dictClient` — со своим кэшем, ключом из сборки, разбором статьи
 * и отдельным сообщением про общую квоту. Отсюда — только имя для списка.
 */
export const YANDEX_SOURCE: { id: TranslatorId; title: string } = { id: 'yandex', title: 'Яндекс.Словарь' }

/** Кого умеет позвать `mtClient`: у Яндекса свой путь, «не переводить» не зовёт никого */
export type MachineTranslatorId = Exclude<TranslatorId, 'none' | 'yandex'>

export interface TranslatorCredentials {
  /** Свой сервер LibreTranslate или инстанс Lingva; у DeepL адрес выбирается по виду ключа */
  baseUrl: string
  apiKey: string
  /** Azure привязывает ключ к региону ресурса, остальным поле не нужно */
  region: string
}

export interface TranslateRequest {
  url: string
  method: 'GET' | 'POST'
  headers: Record<string, string>
  /** У GET-переводчиков всё уходит в адресе */
  body?: string
}

export interface Translator {
  id: MachineTranslatorId
  title: string
  /** Куда идти за ключом или за описанием сервиса */
  keyUrl: string
  /** DeepL и Azure берут ключ обязательно, публичные серверы — не всегда */
  requiresKey: boolean
  /** Адрес сервера обязателен: свой LibreTranslate, выбранный инстанс Lingva */
  requiresUrl: boolean
  /**
   * Внутренний эндпоинт чужого веб-клиента, а не публичный API: работает без ключа
   * и без регистрации, но может закрыться или начать отдавать капчу в любой день.
   */
  unofficial: boolean
  buildRequest: (text: string, source: string, target: string, credentials: TranslatorCredentials) => TranslateRequest
  extractText: (data: unknown) => string
}

const JSON_HEADERS: Record<string, string> = { 'Content-Type': 'application/json' }

/** Токен на десять минут выдают анониму, ключ и регистрация не нужны */
export const EDGE_AUTH_URL = 'https://edge.microsoft.com/translate/auth'

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

/** Edge и Azure — один API Microsoft: тело и ответ общие, разные только адрес и авторизация */
function microsoftBody(text: string): string {
  return JSON.stringify([{ Text: text }])
}

function extractMicrosoft(data: unknown): string {
  const first = Array.isArray(data) ? data[0] : undefined
  if (!isObject(first) || !Array.isArray(first.translations)) return ''
  const translation = first.translations[0]

  return isObject(translation) && typeof translation.text === 'string' ? translation.text : ''
}

export const TRANSLATORS: Record<MachineTranslatorId, Translator> = {
  mymemory: {
    id: 'mymemory',
    title: 'MyMemory',
    keyUrl: 'https://mymemory.translated.net/doc/spec.php',
    requiresKey: false,
    requiresUrl: false,
    unofficial: false,
    // почта лежит в поле ключа: MyMemory поднимает по ней суточную квоту с 5 до 50 тысяч
    // слов, но ключом её не считает — запрос уходит и без неё
    buildRequest: (text, source, target, { apiKey }) => {
      const query = new URLSearchParams({ q: text, langpair: `${source}|${target}` })
      if (apiKey) query.set('de', apiKey)

      return {
        url: `https://api.mymemory.translated.net/get?${query.toString()}`,
        method: 'GET',
        headers: {},
      }
    },
    extractText: (data) => {
      if (!isObject(data) || !isObject(data.responseData)) return ''
      // кончившуюся квоту MyMemory отдаёт http-статусом 200, а предупреждение кладёт
      // на место перевода: без проверки статуса в теле оно попало бы в карточку как перевод
      if (Number(data.responseStatus) !== 200) return ''

      return typeof data.responseData.translatedText === 'string' ? data.responseData.translatedText : ''
    },
  },

  google: {
    id: 'google',
    title: 'Google Translate',
    keyUrl: 'https://translate.google.com',
    requiresKey: false,
    requiresUrl: false,
    unofficial: true,
    buildRequest: (text, source, target) => {
      const query = new URLSearchParams({ client: 'gtx', sl: source, tl: target, dt: 't', q: text })

      return {
        url: `https://translate.googleapis.com/translate_a/single?${query.toString()}`,
        method: 'GET',
        headers: {},
      }
    },
    // ответ — вложенные массивы без имён полей; переводы лежат первыми элементами
    // кусков в data[0] и склеиваются в одну строку: длинную фразу сервис делит сам
    extractText: (data) => {
      if (!Array.isArray(data) || !Array.isArray(data[0])) return ''

      return data[0]
        .map((chunk: unknown) => (Array.isArray(chunk) && typeof chunk[0] === 'string' ? chunk[0] : ''))
        .join('')
    },
  },

  edge: {
    id: 'edge',
    title: 'Microsoft Edge',
    keyUrl: 'https://www.microsoft.com/translator',
    requiresKey: false,
    requiresUrl: false,
    unofficial: true,
    // ключ приходит не от пользователя: `mtClient` берёт анонимный токен по `EDGE_AUTH_URL`
    buildRequest: (text, source, target, { apiKey }) => ({
      url: `https://api-edge.cognitive.microsofttranslator.com/translate?api-version=3.0&from=${source}&to=${target}`,
      method: 'POST',
      headers: { ...JSON_HEADERS, Authorization: `Bearer ${apiKey}` },
      body: microsoftBody(text),
    }),
    extractText: extractMicrosoft,
  },

  lingva: {
    id: 'lingva',
    title: 'Lingva',
    keyUrl: 'https://github.com/thedaviddelta/lingva-translate#instances',
    requiresKey: false,
    requiresUrl: true,
    // это прокси к Google, поднятый добровольцами: и сам эндпоинт неофициальный,
    // и инстанс живёт ровно столько, сколько его держит владелец
    unofficial: true,
    buildRequest: (text, source, target, { baseUrl }) => ({
      url: `${trimUrl(baseUrl)}/api/v1/${source}/${target}/${encodeURIComponent(text)}`,
      method: 'GET',
      headers: {},
    }),
    extractText: (data) => (isObject(data) && typeof data.translation === 'string' ? data.translation : ''),
  },

  deepl: {
    id: 'deepl',
    title: 'DeepL',
    keyUrl: 'https://www.deepl.com/pro-api',
    requiresKey: true,
    requiresUrl: false,
    unofficial: false,
    buildRequest: (text, source, target, { apiKey }) => ({
      url: `${deeplBaseUrl(apiKey)}/v2/translate`,
      method: 'POST',
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

  azure: {
    id: 'azure',
    title: 'Azure Translator',
    keyUrl: 'https://portal.azure.com',
    requiresKey: true,
    requiresUrl: false,
    unofficial: false,
    // регион обязателен для ресурсов, заведённых не как Global: без заголовка ключ отклоняют
    buildRequest: (text, source, target, { apiKey, region }) => ({
      url: `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=${source}&to=${target}`,
      method: 'POST',
      headers: region
        ? { ...JSON_HEADERS, 'Ocp-Apim-Subscription-Key': apiKey, 'Ocp-Apim-Subscription-Region': region }
        : { ...JSON_HEADERS, 'Ocp-Apim-Subscription-Key': apiKey },
      body: microsoftBody(text),
    }),
    extractText: extractMicrosoft,
  },

  libre: {
    id: 'libre',
    title: 'LibreTranslate',
    keyUrl: 'https://portal.libretranslate.com',
    requiresKey: false,
    requiresUrl: true,
    unofficial: false,
    buildRequest: (text, source, target, { baseUrl, apiKey }) => ({
      url: `${trimUrl(baseUrl)}/translate`,
      method: 'POST',
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

function isTranslatorId(id: string): id is MachineTranslatorId {
  return id in TRANSLATORS
}

export function getTranslator(id: string): Translator | undefined {
  return isTranslatorId(id) ? TRANSLATORS[id] : undefined
}
