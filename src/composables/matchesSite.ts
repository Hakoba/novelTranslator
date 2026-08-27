/** Сопоставление адреса страницы с записью списка разрешённых сайтов. Без браузерных API — тестируется в node. */

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)

    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url)

    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`
  } catch {
    return url
  }
}

export function matchesSite(currentUrl: string, pattern: string): boolean {
  try {
    const current = new URL(currentUrl)
    const patternUrl = new URL(pattern)

    if (current.protocol !== patternUrl.protocol) return false
    if (!matchesHost(current.host, patternUrl.host)) return false
    if (patternUrl.pathname === '/') return true

    return current.pathname.startsWith(patternUrl.pathname)
  } catch {
    return false
  }
}

/** Сегмент с цифрой — идентификатор поста или главы: дальше путь уникален для страницы */
function isVolatile(segment: string): boolean {
  return /\d/.test(segment)
}

/**
 * Ключ для ручного выбора области: путь до первого сегмента-идентификатора.
 * Выбранная на странице поста область должна работать на всех постах, но не на ленте
 * того же сайта: у reddit это `/r/sub/comments/` против `/r/sub/`.
 */
export function areaPattern(url: string): string {
  try {
    const parsed = new URL(url)
    const segments = parsed.pathname.split('/').filter(Boolean)
    const cut = segments.findIndex(isVolatile)
    const stable = cut === -1 ? segments : segments.slice(0, cut)

    return `${parsed.protocol}//${parsed.host}/${stable.map((segment) => `${segment}/`).join('')}`
  } catch {
    return url
  }
}

/** www.example.com и example.com — один сайт: иначе запись из адресной строки не совпадает с введённой руками */
function stripWww(host: string): string {
  return host.startsWith('www.') ? host.slice(4) : host
}

function matchesHost(currentHost: string, patternHost: string): boolean {
  if (patternHost.startsWith('*.')) {
    const domain = patternHost.slice(2)

    return currentHost === domain || currentHost.endsWith(`.${domain}`)
  }

  return stripWww(currentHost) === stripWww(patternHost)
}
