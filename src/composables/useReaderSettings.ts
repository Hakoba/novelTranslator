import type { Ref } from 'vue'
import { useBrowserSyncStorage } from './useBrowserStorage'
import { browserLanguage } from '@/utils/languages'
import type { CefrLevel } from '@/types/words'

/** Длиннее уточнение начинает перевешивать сам промпт, а токены платные */
export const PROMPT_EXTRA_LIMIT = 500

export interface ReaderSettings {
  /** Уровень читателя: слова ниже него подсвечивать незачем — он их и так знает */
  level: CefrLevel
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
}

// родной язык угадываем по браузеру: тому, у кого интерфейс на русском, вряд ли
// нужен перевод на английский. Совпал с изучаемым — уводим в русский
const NATIVE = browserLanguage() ?? 'ru'

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  level: 'B1',
  autoAnalyze: true,
  sourceLang: 'en',
  targetLang: NATIVE === 'en' ? 'ru' : NATIVE,
  promptExtra: '',
  // интерфейс переведён не на все языки: незнакомый язык браузера уводим в английский
  uiLang: NATIVE === 'ru' ? 'ru' : 'en',
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
