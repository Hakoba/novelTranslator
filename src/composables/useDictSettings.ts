import type { Ref } from 'vue'
import { useBrowserSyncStorage } from './useBrowserStorage'
import type { TranslatorId } from '@/utils/mt/translators'

export interface DictSettings {
  /** Ключ Яндекс.Словаря (dictionary.yandex.net), бесплатный, выдаётся в кабинете разработчика */
  yandexKey: string
  /** Одиночные слова переводить словарём, а не моделью: быстрее и не тратит токены */
  preferDictionary: boolean
  /** Машинный переводчик для фраз: дешевле модели, но без уровня и пояснений */
  translator: TranslatorId
  deeplKey: string
  /** Свой или публичный сервер LibreTranslate */
  libreUrl: string
  libreKey: string
}

export const DEFAULT_DICT_SETTINGS: DictSettings = {
  yandexKey: '',
  preferDictionary: true,
  translator: 'none',
  deeplKey: '',
  libreUrl: 'https://libretranslate.com',
  libreKey: '',
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
