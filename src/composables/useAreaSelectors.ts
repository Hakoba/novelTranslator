import type { Ref } from 'vue'
import { useBrowserLocalStorage } from './useBrowserStorage'
import { areaPattern, matchesArea } from './matchesSite'

export interface AreaSelector {
  /** Адрес-паттерн страниц одного вида: `https://reddit.com/r/nosleep/comments/` */
  pattern: string
  /** CSS-селектор области, которую пользователь выбрал руками */
  selector: string
  addedAt: number
}

// массив, а не объект по хостам: mergeDeep в useBrowserStorage идёт по ключам
// дефолта и у пустого объекта вычистил бы всё сохранённое
const { data, promise } = useBrowserLocalStorage<AreaSelector[]>('AREA_SELECTORS', [])

/** Запись того же вида страницы: у главной, ленты и статьи они разные */
function findMatch(url: string): AreaSelector | undefined {
  return data.value.find((item) => matchesArea(url, item.pattern))
}

export function useAreaSelectors(): {
  selectors: Ref<AreaSelector[]>
  promise: Promise<unknown>
  hasSelector: (url: string) => boolean
  setSelector: (url: string, selector: string) => void
  clearSelector: (url: string) => void
} {
  // методы
  function hasSelector(url: string): boolean {
    return Boolean(findMatch(url))
  }

  function setSelector(url: string, selector: string): void {
    const pattern = areaPattern(url)
    const existing = findMatch(url)

    if (existing) {
      existing.selector = selector
      existing.addedAt = Date.now()
      return
    }

    data.value.push({ pattern, selector, addedAt: Date.now() })
  }

  /** Снимаем область только с этого вида страниц: выбор на главной и на статьях — разные записи */
  function clearSelector(url: string): void {
    data.value = data.value.filter((item) => !matchesArea(url, item.pattern))
  }

  return { selectors: data, promise, hasSelector, setSelector, clearSelector }
}

/** Для не-Vue кода (pageText): дожидается загрузки из storage */
export async function getAreaSelector(url: string): Promise<string | undefined> {
  await promise

  return findMatch(url)?.selector
}
