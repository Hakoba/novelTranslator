import { computed } from 'vue'
import { useBrowserSyncStorage } from './useBrowserStorage'

export interface AccessSite {
  url: string
  enabled: boolean
  addedAt: number
}

const STORAGE_KEY = 'ACCESS_SITES'
const DEFAULT_SITES: AccessSite[] = [
  {
    url: 'https://novelbin.com/',
    enabled: true,
    addedAt: Date.now(),
  },
]

export function useAccessSites() {
  const { data: sites, promise } = useBrowserSyncStorage<AccessSite[]>(
    STORAGE_KEY,
    DEFAULT_SITES
  )

  const enabledSites = computed<AccessSite[]>(() =>
    sites.value.filter((site) => site.enabled)
  )

  function addSite(url: string): boolean {
    if (!isValidUrl(url)) {
      return false
    }

    const normalizedUrl = normalizeUrl(url)
    const exists = sites.value.some((site) => site.url === normalizedUrl)

    if (exists) {
      return false
    }

    sites.value.push({
      url: normalizedUrl,
      enabled: true,
      addedAt: Date.now(),
    })

    return true
  }

  function removeSite(url: string): void {
    const index = sites.value.findIndex((site) => site.url === url)
    if (index !== -1) {
      sites.value.splice(index, 1)
    }
  }

  function toggleSite(url: string): void {
    const site = sites.value.find((site) => site.url === url)
    if (site) {
      site.enabled = !site.enabled
    }
  }

  function isCurrentSiteAllowed(): boolean {
    const currentUrl = window.location.href
    return enabledSites.value.some((site) => matchesPattern(currentUrl, site.url))
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

function isValidUrl(url: string): boolean {
  try {

    return true
  } catch {
    return false
  }
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`
  } catch {
    return url
  }
}

function matchesPattern(currentUrl: string, pattern: string): boolean {
  try {
    const current = new URL(currentUrl)
    const patternUrl = new URL(pattern)

    if (current.protocol !== patternUrl.protocol) {
      return false
    }

    if (!matchesHost(current.host, patternUrl.host)) {
      return false
    }

    if (patternUrl.pathname === '/') {
      return true
    }

    return current.pathname.startsWith(patternUrl.pathname)
  } catch {
    return false
  }
}

function matchesHost(currentHost: string, patternHost: string): boolean {
  if (patternHost.startsWith('*.')) {
    const domain = patternHost.slice(2)
    return currentHost === domain || currentHost.endsWith(`.${domain}`)
  }

  return currentHost === patternHost
}
