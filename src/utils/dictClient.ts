import type { LookupResult } from '@/types/lookup'
import { dictKey, getDictSettings } from '@/composables/useDictSettings'
import { machineTranslate } from '@/utils/mtClient'
import { getReaderSettings } from '@/composables/useReaderSettings'
import { sendBgFetch } from '@/utils/bgFetch'
import { normalizeTerm } from '@/utils/dictionary'
import { parseFreeDictionary, parseYandexLookup } from '@/utils/dict/parse'
import { t } from '@/utils/i18n'

/** Хост словаря: доступ к нему просит страница настроек при выборе Яндекса */
export const YANDEX_LOOKUP_ORIGIN = 'https://dictionary.yandex.net'
const YANDEX_URL = `${YANDEX_LOOKUP_ORIGIN}/api/v1/dicservice.json/lookup`

/** Куда ведёт атрибуция: активная ссылка на сервис — требование условий использования */
export const YANDEX_DICT_URL = 'https://yandex.ru/dev/dictionary/'
const FREE_URL = 'https://api.dictionaryapi.dev/api/v2/entries'

export type LookupOutcome = {
  results: LookupResult[]
  /** Заполняется, только если словарь ответил отказом: «слово не найдено» ошибкой не считается */
  error?: string
}

// одно и то же слово раскрывают по нескольку раз за главу, а ответы словарей
// неизменны. Кэш по источникам, а не по итогу: разбор страницы спрашивает один
// Яндекс, карточка при наведении — оба, и ответ Яндекса у них общий
const cache = new Map<string, Promise<LookupResult | undefined>>()

function cachedLookup(
  key: string,
  fetch: () => Promise<LookupResult | undefined>,
): Promise<LookupResult | undefined> {
  const existing = cache.get(key)
  if (existing) return existing

  const promise = fetch()
  cache.set(key, promise)

  return promise
}

export async function lookupYandex(term: string): Promise<LookupResult | undefined> {
  const settings = await getDictSettings()
  const key = dictKey(settings)
  if (!key) return undefined

  const { sourceLang, targetLang } = await getReaderSettings()
  // пару Яндекс может не знать — тогда ответит ошибкой, и словарь просто промолчит
  const pair = `${sourceLang}-${targetLang}`
  const query = `key=${encodeURIComponent(key)}&lang=${pair}&text=${encodeURIComponent(term)}`
  const res = await sendBgFetch(`${YANDEX_URL}?${query}`, { method: 'GET' })

  if (res.status === 401 || res.status === 403) throw new Error(t('errors.dictKeyRejected'))
  if (!res.ok) return undefined

  return parseYandexLookup(res.data, term)
}

export async function lookupFreeDictionary(term: string): Promise<LookupResult | undefined> {
  const { sourceLang } = await getReaderSettings()

  // 404 здесь — «такого слова нет» или «такого языка нет», а не сбой
  const res = await sendBgFetch(`${FREE_URL}/${sourceLang}/${encodeURIComponent(term)}`, { method: 'GET' })
  if (!res.ok) return undefined

  return parseFreeDictionary(res.data, term)
}

/**
 * Перевод выбранным машинным переводчиком в виде словарной статьи: один смысл,
 * без транскрипции и частей речи. Яндекс новые ключи не выдаёт, и это то, что
 * остаётся карточке из коробки.
 */
async function lookupMachine(term: string): Promise<LookupResult | undefined> {
  const translation = await machineTranslate(term)

  return translation ? { source: 'machine', term, senses: [{ translations: [translation] }] } : undefined
}

async function runLookup(term: string, withDefinitions: boolean): Promise<LookupOutcome> {
  const normalized = normalizeTerm(term)
  if (!normalized) return { results: [] }

  // языки и источник в ключе: сменил их в настройках — старые ответы больше не подходят
  const { sourceLang, targetLang } = await getReaderSettings()
  const { translator } = await getDictSettings()
  const key = `${translator}:${sourceLang}-${targetLang}:${normalized}`

  // перевод — от источника из настроек; «не переводить» оставляет одни толкования
  const sources: Promise<LookupResult | undefined>[] = []
  if (translator === 'yandex') sources.push(cachedLookup(`yandex:${key}`, () => lookupYandex(term)))
  else if (translator !== 'none') sources.push(cachedLookup(`machine:${key}`, () => lookupMachine(term)))
  if (withDefinitions) sources.push(cachedLookup(`free:${key}`, () => lookupFreeDictionary(term)))

  const settled = await Promise.allSettled(sources)

  return {
    results: settled
      .map((item) => (item.status === 'fulfilled' ? item.value : undefined))
      .filter((result): result is LookupResult => Boolean(result)),
    error: settled
      .map((item) => (item.status === 'rejected' && item.reason instanceof Error ? item.reason.message : undefined))
      .find(Boolean),
  }
}

/**
 * Перевод и толкование разом: перевод от выбранного источника, толкование
 * от англо-английского словаря. Отказ одного не отменяет ответ другого.
 */
export function lookupTerm(term: string): Promise<LookupOutcome> {
  return runLookup(term, true)
}

/**
 * Только перевод, без толкований. Разбор страницы зовёт словарь на каждое найденное
 * слово разом — тратить на этот залп второй запрос к Free Dictionary незачем:
 * его толкования нужны лишь карточке при наведении, она и сходит за ними сама.
 */
export function lookupTranslation(term: string): Promise<LookupOutcome> {
  return runLookup(term, false)
}
