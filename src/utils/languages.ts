/**
 * Языки, между которыми расширение умеет работать. `code` — ISO 639-1, его же
 * понимают Google, Яндекс и dictionaryapi; `english` уходит в промпт модели
 * и в адрес Reverso, `native` показывается в настройках.
 */
export interface Language {
  code: string
  native: string
  english: string
}

export const LANGUAGES: Language[] = [
  { code: 'en', native: 'English', english: 'English' },
  { code: 'ru', native: 'Русский', english: 'Russian' },
  { code: 'de', native: 'Deutsch', english: 'German' },
  { code: 'fr', native: 'Français', english: 'French' },
  { code: 'es', native: 'Español', english: 'Spanish' },
  { code: 'it', native: 'Italiano', english: 'Italian' },
  { code: 'pt', native: 'Português', english: 'Portuguese' },
  { code: 'pl', native: 'Polski', english: 'Polish' },
  { code: 'uk', native: 'Українська', english: 'Ukrainian' },
  { code: 'tr', native: 'Türkçe', english: 'Turkish' },
  { code: 'ja', native: '日本語', english: 'Japanese' },
  { code: 'zh', native: '中文', english: 'Chinese' },
  { code: 'ko', native: '한국어', english: 'Korean' },
]

/**
 * Языки, на которые переведён сам интерфейс. Список короче `LANGUAGES`: переводить
 * текст расширение умеет и туда, где интерфейса на этом языке нет.
 */
export const UI_LANGUAGE_CODES = ['en', 'ru', 'es', 'pt', 'zh', 'ko'] as const

export type UiLanguage = (typeof UI_LANGUAGE_CODES)[number]

export function isUiLanguage(code: string): code is UiLanguage {
  return UI_LANGUAGE_CODES.some((item) => item === code)
}

export const UI_LANGUAGES: Language[] = LANGUAGES.filter((item) => isUiLanguage(item.code))

/** Язык браузера, если интерфейс на нём есть; иначе английский — он понятен шире прочих */
export function defaultUiLanguage(): UiLanguage {
  const code = browserLanguage()

  return code && isUiLanguage(code) ? code : 'en'
}

export function findLanguage(code: string): Language | undefined {
  return LANGUAGES.find((item) => item.code === code)
}

/** Имя для промпта: неизвестный код отдаём как есть — модель разберётся лучше, чем упадёт запрос */
export function languageName(code: string): string {
  return findLanguage(code)?.english ?? code
}

/**
 * Язык интерфейса браузера в виде кода из таблицы. `ru-RU` → `ru`,
 * неизвестный язык → undefined.
 */
export function browserLanguage(): string | undefined {
  const code = globalThis.navigator?.language?.split('-')[0]

  return code && findLanguage(code) ? code : undefined
}
