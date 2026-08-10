import type { Ref } from 'vue'
import { useBrowserSyncStorage } from './useBrowserStorage'
import { browserLanguage, defaultUiLanguage } from '@/utils/languages'
import type { CefrLevel } from '@/types/words'

/** Длиннее уточнение начинает перевешивать сам промпт, а токены платные */
export const PROMPT_EXTRA_LIMIT = 500

/**
 * Что показывать при выделении текста на странице:
 * `translate` — сразу карточку с переводом, `hint` — сначала кнопку с логотипом
 * (перевод уходит только по клику), `save` — одну кнопку «в словарь», `off` — ничего.
 */
export const SELECTION_MODES = ['translate', 'hint', 'save', 'off'] as const

export type SelectionMode = (typeof SELECTION_MODES)[number]

/**
 * Кто ищет сложные слова: `dictionary` — офлайн-профиль CEFR и словарь, работает
 * сразу после установки; `llm` — модель, видит контекст и фразы, но нужен ключ.
 */
export const WORD_ENGINES = ['dictionary', 'llm'] as const

export type WordEngine = (typeof WORD_ENGINES)[number]

export interface ReaderSettings {
  /** Уровень читателя: слова ниже него подсвечивать незачем — он их и так знает */
  level: CefrLevel
  /** Чем разбирать страницу */
  engine: WordEngine
  /** Звать модель сразу при открытии страницы. Выключено — только по кнопке в оверлее */
  autoAnalyze: boolean
  /** Язык текстов, которые читаем */
  sourceLang: string
  /** Язык, на который переводим */
  targetLang: string
  /** Уточнение к промпту от читателя: жанр, имена, манера перевода */
  promptExtra: string
  /** Язык интерфейса самого расширения */
  uiLang: string
  /** Вкраплять слова словаря в страницы на языке перевода */
  immersion: boolean
  /** Реакция на выделение текста на странице */
  selectionMode: SelectionMode
}

// родной язык угадываем по браузеру: тому, у кого интерфейс на русском, вряд ли
// нужен перевод на английский. Совпал с изучаемым — уводим в русский
const NATIVE = browserLanguage() ?? 'ru'

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  level: 'B1',
  // после установки ключа ещё нет, а расширение должно уже что-то делать
  engine: 'dictionary',
  autoAnalyze: true,
  sourceLang: 'en',
  targetLang: NATIVE === 'en' ? 'ru' : NATIVE,
  promptExtra: '',
  // интерфейс переведён не на все языки: незнакомый язык браузера уводим в английский
  uiLang: defaultUiLanguage(),
  immersion: false,
  selectionMode: 'translate',
}

const { data, promise } = useBrowserSyncStorage<ReaderSettings>(
  'reader-settings',
  DEFAULT_READER_SETTINGS,
)

export function useReaderSettings(): {
  settings: Ref<ReaderSettings>
  promise: Promise<unknown>
} {
  return { settings: data, promise }
}

/** Для не-Vue кода (llmClient): дожидается загрузки из storage */
export async function getReaderSettings(): Promise<ReaderSettings> {
  await promise

  return data.value
}
