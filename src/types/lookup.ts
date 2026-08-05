/** Ответ внешнего словаря, приведённый к общему виду: у провайдеров разметка разная. */

export type LookupSource = 'yandex' | 'free'

/** Один смысл: у Яндекса это перевод с синонимами, у англо-английского — определение */
export type LookupSense = {
  partOfSpeech?: string
  translations?: string[]
  definition?: string
  example?: string
}

export type LookupResult = {
  source: LookupSource
  term: string
  transcription?: string
  senses: LookupSense[]
}

export const SOURCE_TITLES: Record<LookupSource, string> = {
  yandex: 'Яндекс.Словарь',
  free: 'Dictionary API',
}
