import { computed, ref, type ComputedRef, type Ref } from 'vue'
import browser from 'webextension-polyfill'
import { matchesOriginPattern, originPattern } from './matchesSite'
import { requestScriptsSync } from '@/utils/siteScripts'

const ALL_SITES = '<all_urls>'

/** Выданные шаблоны доступа. Общие на все экземпляры: разрешения одни на расширение */
const granted = ref<string[]>([])
let loading: Promise<void> | undefined

async function reload(): Promise<void> {
  const { origins = [] } = await browser.permissions.getAll()
  granted.value = origins
}

function load(): Promise<void> {
  if (loading) return loading

  loading = reload()
  browser.permissions.onAdded.addListener(() => void reload())
  browser.permissions.onRemoved.addListener(() => void reload())

  return loading
}

/**
 * Доступ к сайтам и сервисам. Список сайтов лежит в `storage.sync` и приезжает
 * на другое устройство, а разрешения браузера — нет: там каждому сайту
 * приходится выдавать доступ заново, и экраны показывают такие записи отдельно.
 * `request` зовётся только из обработчика жеста: без него браузер молча откажет.
 * Только страницы расширения — в content script `permissions` нет.
 */
export function useHostAccess(): {
  promise: Promise<void>
  hasAllAccess: ComputedRef<boolean>
  hasAccess: (url: string) => boolean
  requestAccess: (urls: string[]) => Promise<boolean>
  requestAllAccess: () => Promise<boolean>
} {
  const promise = load()

  const hasAllAccess = computed<boolean>(() => granted.value.includes(ALL_SITES))

  function hasAccess(url: string): boolean {
    return granted.value.some((pattern) => matchesOriginPattern(url, pattern))
  }

  async function request(origins: string[]): Promise<boolean> {
    let ok = false
    try {
      ok = await browser.permissions.request({ origins })
    } catch (error) {
      // Firefox бросает, если запрос пришёл не из жеста; Chrome в этом случае просто отказывает
      console.info('[nt] запрос доступа отклонён:', error)
    }
    if (!ok) return false

    await reload()
    await requestScriptsSync()

    return true
  }

  function requestAccess(urls: string[]): Promise<boolean> {
    const origins = [...new Set(urls.map(originPattern).filter((pattern): pattern is string => Boolean(pattern)))]
    const missing = origins.filter((pattern) => !granted.value.includes(pattern))
    if (!missing.length || urls.every(hasAccess)) return Promise.resolve(true)

    return request(missing)
  }

  function requestAllAccess(): Promise<boolean> {
    return hasAllAccess.value ? Promise.resolve(true) : request([ALL_SITES])
  }

  return { promise, hasAllAccess, hasAccess, requestAccess, requestAllAccess }
}

/** Хосты для подписи кнопки: `api.openai.com`, а не полный адрес с путём */
export function hostsOf(urls: string[]): string {
  return [...new Set(urls.map((url) => {
    try {
      return new URL(url).host
    } catch {
      return url
    }
  }))].join(', ')
}
