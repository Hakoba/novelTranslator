/** Ответ внешнего словаря, приведённый к общему виду: у провайдеров разметка разная. */

/** `machine` — выбранный машинный переводчик: один перевод без значений и транскрипции */
export type LookupSource = 'yandex' | 'free' | 'machine'

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
