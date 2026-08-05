import type { Ref } from 'vue'
import { useBrowserLocalStorage } from './useBrowserStorage'
import { normalizeHost } from '@/utils/extract/rules'

export interface AreaSelector {
  host: string
  /** CSS-селектор области, которую пользователь выбрал руками */
  selector: string
  addedAt: number
}

// массив, а не объект по хостам: mergeDeep в useBrowserStorage идёт по ключам
// дефолта и у пустого объекта вычистил бы всё сохранённое
const { data, promise } = useBrowserLocalStorage<AreaSelector[]>('AREA_SELECTORS', [])

export function useAreaSelectors(): {
  selectors: Ref<AreaSelector[]>
  promise: Promise<unknown>
  hasSelector: (host: string) => boolean
  setSelector: (host: string, selector: string) => void
  clearSelector: (host: string) => void
} {
  // методы
  function hasSelector(host: string): boolean {
    const key = normalizeHost(host)

    return data.value.some((item) => item.host === key)
  }

  function setSelector(host: string, selector: string): void {
    const key = normalizeHost(host)
    const existing = data.value.find((item) => item.host === key)

    if (existing) {
      existing.selector = selector
      existing.addedAt = Date.now()
      return
    }

    data.value.push({ host: key, selector, addedAt: Date.now() })
  }

  /** Без записи разбор снова идёт по общим правилам — надгробие тут не нужно */
  function clearSelector(host: string): void {
    const key = normalizeHost(host)
    data.value = data.value.filter((item) => item.host !== key)
  }

  return { selectors: data, promise, hasSelector, setSelector, clearSelector }
}

/** Для не-Vue кода (pageText): дожидается загрузки из storage */
export async function getAreaSelector(host: string): Promise<string | undefined> {
  await promise
  const key = normalizeHost(host)

  return data.value.find((item) => item.host === key)?.selector
}
