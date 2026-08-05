import type { Ref } from 'vue'
import { useBrowserSyncStorage } from './useBrowserStorage'
import type { CefrLevel } from '@/types/words'

export interface ReaderSettings {
  /** Уровень читателя: слова ниже него подсвечивать незачем — он их и так знает */
  level: CefrLevel
  /** Звать модель сразу при открытии страницы. Выключено — только по кнопке в оверлее */
  autoAnalyze: boolean
}

export const DEFAULT_READER_SETTINGS: ReaderSettings = { level: 'B1', autoAnalyze: true }

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
