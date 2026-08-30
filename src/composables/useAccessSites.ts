import { computed, type ComputedRef, type Ref } from 'vue'
import { useBrowserSyncStorage } from './useBrowserStorage'
import { isSiteAllowed, isValidUrl, matchesSite, normalizeUrl, type AccessMode } from './matchesSite'

export interface AccessSite {
  url: string
  enabled: boolean
  addedAt: number
}

export interface AccessOptions {
  mode: AccessMode
  guarded: boolean
}

const SITES_KEY = 'ACCESS_SITES'
const TRUSTED_KEY = 'TRUSTED_SITES'
const BLOCKED_KEY = 'BLOCKED_SITES'
const OPTIONS_KEY = 'ACCESS_OPTIONS'

const DEFAULT_SITES: AccessSite[] = [
  {
    url: 'https://www.reddit.com/',
    enabled: true,
    addedAt: 0,
  },
]

/**
 * Режим по умолчанию — белый список: расширение читает текст страницы, и делать это
 * везде без спроса нельзя. Кто хочет наоборот, переключает на экране «Сайты».
 */
const DEFAULT_OPTIONS: AccessOptions = { mode: 'allow', guarded: true }

/**
 * Куда позвать попробовать сразу после установки: длинные истории на английском,
 * отобранные по году, — там расширению есть что разбирать, в отличие от ленты.
 * Живёт рядом со списком по умолчанию, чтобы демо и разрешённый сайт не разъехались.
 */
export const DEMO_URL = 'https://www.reddit.com/r/stories/top/?t=year'

export function useAccessSites(): {
  options: Ref<AccessOptions>
  isDenyMode: ComputedRef<boolean>
  sites: ComputedRef<AccessSite[]>
  enabledSites: ComputedRef<AccessSite[]>
  trusted: Ref<string[]>
  promise: Promise<unknown>
  addSite: (url: string) => boolean
  removeSite: (url: string) => void
  removeMatching: (url: string) => void
  toggleSite: (url: string) => void
  trustSite: (url: string) => void
  untrustSite: (url: string) => void
  isSiteTrusted: (url: string) => boolean
  isCurrentSiteAllowed: () => boolean
  isUrlAllowed: (url: string) => boolean
  isSiteListed: (url: string) => boolean
} {
  // списки у режимов свои: переключение туда и обратно не должно стирать набранное
  const { data: allowed, promise: allowedLoaded } = useBrowserSyncStorage<AccessSite[]>(
    SITES_KEY,
    DEFAULT_SITES,
  )
  const { data: blocked, promise: blockedLoaded } = useBrowserSyncStorage<AccessSite[]>(
    BLOCKED_KEY,
    [],
  )
  const { data: options, promise: optionsLoaded } = useBrowserSyncStorage<AccessOptions>(
    OPTIONS_KEY,
    DEFAULT_OPTIONS,
  )
  /**
   * Адреса, снятые с защиты вручную. Голые строки, а не записи: тумблер тут нечего
   * выключать — исключение либо есть, либо его убрали.
   */
  const { data: trusted, promise: trustedLoaded } = useBrowserSyncStorage<string[]>(TRUSTED_KEY, [])

  const promise = Promise.all([allowedLoaded, blockedLoaded, optionsLoaded, trustedLoaded])

  // computed
  const isDenyMode = computed<boolean>(() => options.value.mode === 'deny')
  const sites = computed<AccessSite[]>(() => (isDenyMode.value ? blocked.value : allowed.value))
  const enabledSites = computed<AccessSite[]>(() =>
    sites.value.filter((site) => site.enabled),
  )
  const patterns = computed<string[]>(() => enabledSites.value.map((site) => site.url))

  // методы
  function addSite(url: string): boolean {
    if (!isValidUrl(url)) return false

    const normalizedUrl = normalizeUrl(url)
    if (sites.value.some((site) => site.url === normalizedUrl)) return false

    // мутируем список активного режима — `sites` отдаёт его же по ссылке
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

  /** Убирает записи, накрывающие адрес: запись бывает шире домена (*.example.com, путь) */
  function removeMatching(url: string): void {
    const rest = sites.value.filter((site) => !matchesSite(url, site.url))
    sites.value.splice(0, sites.value.length, ...rest)
  }

  /** Снять защиту с адреса: домен целиком, путь конкретной страницы тут только мешал бы */
  function trustSite(url: string): void {
    if (!isValidUrl(url)) return

    const normalizedUrl = normalizeUrl(url)
    if (!trusted.value.includes(normalizedUrl)) trusted.value.push(normalizedUrl)
  }

  /** Вернуть адрес под защиту: убираем все записи, которые его накрывают */
  function untrustSite(url: string): void {
    const rest = trusted.value.filter((entry) => entry !== url && !matchesSite(url, entry))
    trusted.value.splice(0, trusted.value.length, ...rest)
  }

  function isSiteTrusted(url: string): boolean {
    return trusted.value.some((entry) => matchesSite(url, entry))
  }

  /** Работает ли расширение на этом адресе — с учётом режима, защиты и снятых с неё адресов */
  function isUrlAllowed(url: string): boolean {
    return isSiteAllowed(url, options.value.mode, patterns.value, options.value.guarded, trusted.value)
  }

  function isCurrentSiteAllowed(): boolean {
    return isUrlAllowed(window.location.href)
  }

  /** Есть ли в списке запись, накрывающая адрес: попапу решать, что предлагать */
  function isSiteListed(url: string): boolean {
    return sites.value.some((site) => matchesSite(url, site.url))
  }

  return {
    options,
    isDenyMode,
    sites,
    enabledSites,
    trusted,
    promise,
    addSite,
    removeSite,
    removeMatching,
    toggleSite,
    trustSite,
    untrustSite,
    isSiteTrusted,
    isCurrentSiteAllowed,
    isUrlAllowed,
    isSiteListed,
  }
}
