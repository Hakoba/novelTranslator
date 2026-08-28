import type { Ref } from 'vue'
import { useBrowserSyncStorage } from './useBrowserStorage'
import type { TranslatorId } from '@/utils/mt/translators'

export interface DictSettings {
  /** Ключ Яндекс.Словаря (dictionary.yandex.net), бесплатный, выдаётся в кабинете разработчика */
  yandexKey: string
  /**
   * Кто переводит слова и фразы до модели: Яндекс.Словарь или машинный переводчик.
   * Дешевле модели, но без уровня и пояснений.
   * По умолчанию Google — единственный из бесключевых, кто знает все пары языков
   * расширения; эндпоинт неофициальный, и об этом сказано в настройках
   */
  translator: TranslatorId
  /** Почта поднимает суточную квоту MyMemory с 5 до 50 тысяч слов; ключом не является */
  myMemoryEmail: string
  /** Инстанс Lingva: публичные держат добровольцы, и они регулярно ложатся */
  lingvaUrl: string
  deeplKey: string
  azureKey: string
  /** Регион ресурса Azure; у ресурсов Global пустой */
  azureRegion: string
  /** Свой или публичный сервер LibreTranslate */
  libreUrl: string
  libreKey: string
}

export const DEFAULT_DICT_SETTINGS: DictSettings = {
  yandexKey: '',
  translator: 'google',
  myMemoryEmail: '',
  lingvaUrl: 'https://lingva.ml',
  deeplKey: '',
  azureKey: '',
  azureRegion: '',
  libreUrl: 'https://libretranslate.com',
  libreKey: '',
}

export const YANDEX_DICT_KEY_URL = 'https://yandex.ru/dev/dictionary/'

/**
 * Общий ключ из сборки. Ключи модели платные и остаются в dev-сборке, а этот
 * бесплатный и с суточной квотой — им расширение переводит слова сразу после
 * установки, без похода за ключом. Квота одна на всех, поэтому свой ключ
 * в настройках его перебивает, а не дополняет.
 */
const bundledKey = __YANDEX_DICT_KEY__

export const HAS_BUNDLED_DICT_KEY = Boolean(bundledKey)

/** Чей ключ пойдёт в запрос. Пустая строка — словарь Яндекса просто промолчит */
export function dictKey(settings: DictSettings): string {
  return settings.yandexKey.trim() || bundledKey
}

/** Общая квота кончается на всех сразу — про это надо говорить не так, как про чужой ключ */
export function isBundledKey(settings: DictSettings): boolean {
  return !settings.yandexKey.trim() && HAS_BUNDLED_DICT_KEY
}

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
