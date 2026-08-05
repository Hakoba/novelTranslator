import type { Ref } from 'vue'
import { useBrowserSyncStorage } from './useBrowserStorage'

export interface DictSettings {
  /** Ключ Яндекс.Словаря (dictionary.yandex.net), бесплатный, выдаётся в кабинете разработчика */
  yandexKey: string
  /** Одиночные слова переводить словарём, а не моделью: быстрее и не тратит токены */
  preferDictionary: boolean
}

export const DEFAULT_DICT_SETTINGS: DictSettings = {
  yandexKey: '',
  preferDictionary: true,
}

export const YANDEX_DICT_KEY_URL = 'https://yandex.ru/dev/dictionary/'

const { data, promise } = useBrowserSyncStorage<DictSettings>('dict-settings', DEFAULT_DICT_SETTINGS)

export function useDictSettings(): {
  settings: Ref<DictSettings>
  promise: Promise<unknown>
} {
  return { settings: data, promise }
}

/** Для не-Vue кода (dictClient): дожидается загрузки из storage */
export async function getDictSettings(): Promise<DictSettings> {
  await promise

  return data.value
}
