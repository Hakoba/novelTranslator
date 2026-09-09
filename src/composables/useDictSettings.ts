import type { Ref } from 'vue'
import { useBrowserSyncStorage } from './useBrowserStorage'
import { isTranslatorId, type TranslatorId } from '@/utils/mt/translators'

export interface DictSettings {
  /**
   * Ключ Яндекс.Словаря (dictionary.yandex.net). Новые ключи Яндекс не выдаёт —
   * форма выдачи редиректит на обратную связь; поле для тех, у кого ключ уже есть
   */
  yandexKey: string
  /**
   * Кто переводит слова и фразы до модели: Яндекс.Словарь или машинный переводчик.
   * Дешевле модели, но без уровня и пояснений.
   * По умолчанию MyMemory: единственный бесключевой с официальным тарифом. Пакетные
   * бесключевые кончились: точку токена Edge Microsoft закрыл (404), Google банит
   * по частоте, DeepL из России отвечает 451
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
  translator: 'mymemory',
  myMemoryEmail: '',
  lingvaUrl: 'https://lingva.ml',
  deeplKey: '',
  azureKey: '',
  azureRegion: '',
  libreUrl: 'https://libretranslate.com',
  libreKey: '',
}

/** Ключ для запроса. Пустая строка — словарь Яндекса просто промолчит */
export function dictKey(settings: DictSettings): string {
  return settings.yandexKey.trim()
}

const { data, promise: loaded } = useBrowserSyncStorage<DictSettings>('dict-settings', DEFAULT_DICT_SETTINGS)

// переводчик, которого больше нет в списке (Edge закрылся), уступает место дефолту —
// иначе выбор в настройках пуст, а перевод молча не идёт
const promise = loaded.then(() => {
  if (!isTranslatorId(data.value.translator)) data.value.translator = DEFAULT_DICT_SETTINGS.translator
})

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
