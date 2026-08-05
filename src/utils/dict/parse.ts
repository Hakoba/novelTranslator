// Разбор ответов внешних словарей. Без DOM и браузерных API — тестируется в node.

import type { LookupResult, LookupSense } from '@/types/lookup'

/** Больше не влезает в панель оверлея, а первые значения и есть самые частые */
const MAX_SENSES = 3
const MAX_TRANSLATIONS = 6

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()

  return trimmed || undefined
}

/** Яндекс одинаково кодирует переводы, синонимы и примеры — списком объектов с полем text */
function texts(value: unknown): string[] {
  return asArray(value)
    .map((item) => (isRecord(item) ? asString(item.text) : undefined))
    .filter((text): text is string => Boolean(text))
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values))
}

/** Ответ dictionary.yandex.net: def → tr (переводы) → syn (синонимы), ex (примеры) */
export function parseYandexLookup(data: unknown, term: string): LookupResult | undefined {
  if (!isRecord(data)) return undefined

  const senses: LookupSense[] = []
  let transcription: string | undefined

  for (const def of asArray(data.def).slice(0, MAX_SENSES)) {
    if (!isRecord(def)) continue

    transcription = transcription ?? asString(def.ts)

    const translations: string[] = []
    let example: string | undefined

    for (const tr of asArray(def.tr)) {
      if (!isRecord(tr)) continue

      const text = asString(tr.text)
      if (text) translations.push(text)
      translations.push(...texts(tr.syn))
      example = example ?? texts(tr.ex)[0]
    }

    if (!translations.length) continue

    senses.push({
      partOfSpeech: asString(def.pos),
      translations: unique(translations).slice(0, MAX_TRANSLATIONS),
      example,
    })
  }

  if (!senses.length) return undefined

  return { source: 'yandex', term, transcription, senses }
}

/** Ответ api.dictionaryapi.dev: массив статей, у каждой meanings → definitions */
export function parseFreeDictionary(data: unknown, term: string): LookupResult | undefined {
  const article = asArray(data).find(isRecord)
  if (!article) return undefined

  const senses: LookupSense[] = []

  for (const meaning of asArray(article.meanings).slice(0, MAX_SENSES)) {
    if (!isRecord(meaning)) continue

    const entry = asArray(meaning.definitions).find(isRecord)
    const definition = entry && asString(entry.definition)
    if (!definition) continue

    senses.push({
      partOfSpeech: asString(meaning.partOfSpeech),
      definition,
      example: entry && asString(entry.example),
    })
  }

  if (!senses.length) return undefined

  return {
    source: 'free',
    term: asString(article.word) ?? term,
    // phonetic бывает пустым, тогда транскрипция лежит в phonetics вместе со ссылкой на озвучку
    transcription: asString(article.phonetic) ?? texts(article.phonetics)[0],
    senses,
  }
}

/** Первый перевод из ответа словаря — им заполняется карточка, если модель не звали */
export function firstTranslation(result: LookupResult | undefined): string | undefined {
  return result?.senses.flatMap((sense) => sense.translations ?? [])[0]
}
