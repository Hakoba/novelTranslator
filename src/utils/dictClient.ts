import type { LookupResult } from '@/types/lookup'
import { getDictSettings } from '@/composables/useDictSettings'
import { getReaderSettings } from '@/composables/useReaderSettings'
import { sendBgFetch } from '@/utils/bgFetch'
import { normalizeTerm } from '@/utils/dictionary'
import { parseFreeDictionary, parseYandexLookup } from '@/utils/dict/parse'
import { t } from '@/utils/i18n'

const YANDEX_URL = 'https://dictionary.yandex.net/api/v1/dicservice.json/lookup'
const FREE_URL = 'https://api.dictionaryapi.dev/api/v2/entries'

export type LookupOutcome = {
  results: LookupResult[]
  /** Заполняется, только если словарь ответил отказом: «слово не найдено» ошибкой не считается */
  error?: string
}

// одно и то же слово раскрывают по нескольку раз за главу, а ответы словарей неизменны
const cache = new Map<string, LookupOutcome>()

export async function lookupYandex(term: string): Promise<LookupResult | undefined> {
  const { yandexKey } = await getDictSettings()
  if (!yandexKey) return undefined

  const { sourceLang, targetLang } = await getReaderSettings()
  // пару Яндекс может не знать — тогда ответит ошибкой, и словарь просто промолчит
  const pair = `${sourceLang}-${targetLang}`
  const query = `key=${encodeURIComponent(yandexKey)}&lang=${pair}&text=${encodeURIComponent(term)}`
  const res = await sendBgFetch(`${YANDEX_URL}?${query}`, { method: 'GET' })

  if (res.status === 401 || res.status === 403) {
    throw new Error(t('errors.dictKeyRejected'))
  }
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
 * Оба словаря разом: англо-русский даёт перевод, англо-английский — толкование.
 * Отказ одного не отменяет ответ другого.
 */
export async function lookupTerm(term: string): Promise<LookupOutcome> {
  const normalized = normalizeTerm(term)
  if (!normalized) return { results: [] }

  // языки в ключе: сменил пару в настройках — старые ответы больше не подходят
  const { sourceLang, targetLang } = await getReaderSettings()
  const key = `${sourceLang}-${targetLang}:${normalized}`

  const cached = cache.get(key)
  if (cached) return cached

  const settled = await Promise.allSettled([lookupYandex(term), lookupFreeDictionary(term)])

  const outcome: LookupOutcome = {
    results: settled
      .map((item) => (item.status === 'fulfilled' ? item.value : undefined))
      .filter((result): result is LookupResult => Boolean(result)),
    error: settled
      .map((item) => (item.status === 'rejected' && item.reason instanceof Error ? item.reason.message : undefined))
      .find(Boolean),
  }

  cache.set(key, outcome)

  return outcome
}
