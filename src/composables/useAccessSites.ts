import { computed, type ComputedRef, type Ref } from 'vue'
import { useBrowserSyncStorage } from './useBrowserStorage'
import { isValidUrl, matchesSite, normalizeUrl } from './matchesSite'

export interface AccessSite {
  url: string
  enabled: boolean
  addedAt: number
}

const STORAGE_KEY = 'ACCESS_SITES'
const DEFAULT_SITES: AccessSite[] = [
  {
    url: 'https://www.reddit.com/',
    enabled: true,
    addedAt: 0,
  },
]

/**
 * Куда позвать попробовать сразу после установки: длинные истории на английском,
 * отобранные по году, — там расширению есть что разбирать, в отличие от ленты.
 * Живёт рядом со списком по умолчанию, чтобы демо и разрешённый сайт не разъехались.
 */
export const DEMO_URL = 'https://www.reddit.com/r/stories/top/?t=year'

export function useAccessSites(): {
  sites: Ref<AccessSite[]>
  enabledSites: ComputedRef<AccessSite[]>
  promise: Promise<unknown>
  addSite: (url: string) => boolean
  removeSite: (url: string) => void
  toggleSite: (url: string) => void
  isCurrentSiteAllowed: () => boolean
} {
  const { data: sites, promise } = useBrowserSyncStorage<AccessSite[]>(
    STORAGE_KEY,
    DEFAULT_SITES,
  )

  // computed
  const enabledSites = computed<AccessSite[]>(() =>
    sites.value.filter((site) => site.enabled),
  )

  // методы
  function addSite(url: string): boolean {
    if (!isValidUrl(url)) return false

    const normalizedUrl = normalizeUrl(url)
    if (sites.value.some((site) => site.url === normalizedUrl)) return false

    sites.value.push({
      url: normalizedUrl,
      enabled: true,
      addedAt: Date.now(),
    })

    return true
  }

  function removeSite(url: string): void {
    const index = sites.value.findIndex((site) => site.url === url)
    if (index !== -1) sites.value.splice(index, 1)
  }

  function toggleSite(url: string): void {
    const site = sites.value.find((item) => item.url === url)
    if (site) site.enabled = !site.enabled
  }

  function isCurrentSiteAllowed(): boolean {
    return enabledSites.value.some((site) => matchesSite(window.location.href, site.url))
  }

  return {
    sites,
    enabledSites,
    promise,
    addSite,
    removeSite,
    toggleSite,
    isCurrentSiteAllowed,
  }
}
