/** Сопоставление адреса страницы со списком сайтов. Без браузерных API — тестируется в node. */

export type AccessMode = 'allow' | 'deny'

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

/**
 * Сегмент-идентификатор страницы: с цифрой — номер поста или главы, дальше путь
 * уникален. Последний сегмент вложенного пути тоже считаем идентификатором:
 * у статьи `/news/some-title/` цифр нет, а область одна на все статьи раздела.
 * ponytail: эвристика по форме пути; `/about/` сольётся с корнем сайта —
 * для чтения это редкость, точнее только правило на сайт
 */
function isVolatile(segment: string, index: number, segments: string[]): boolean {
  return /\d/.test(segment) || (segments.length > 1 && index === segments.length - 1)
}

/**
 * Ключ для ручного выбора области: путь до первого сегмента-идентификатора.
 * Выбранная на странице поста область должна работать на всех постах, но не на ленте
 * того же сайта: у reddit это `/r/sub/comments/` против `/r/`.
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

/**
 * Тот же вид страницы, что и у сохранённого паттерна — ровно, а не по префиксу:
 * иначе паттерн главной `https://site/` подходил бы каждой странице сайта
 * и область, выбранная на главной, накрывала бы статьи.
 */
export function matchesArea(currentUrl: string, pattern: string): boolean {
  try {
    const current = new URL(areaPattern(currentUrl))
    const wanted = new URL(pattern)

    return (
      current.protocol === wanted.protocol &&
      stripWww(current.host) === stripWww(wanted.host) &&
      current.pathname === wanted.pathname
    )
  } catch {
    return false
  }
}

function matchesHost(currentHost: string, patternHost: string): boolean {
  if (patternHost.startsWith('*.')) {
    const domain = patternHost.slice(2)

    return currentHost === domain || currentHost.endsWith(`.${domain}`)
  }

  return stripWww(currentHost) === stripWww(patternHost)
}

/**
 * Адреса, на которых расширение молчит даже в режиме «везде, кроме»: разбор читает
 * текст страницы, и делать это в почте, в банке или на внутреннем хосте — не то,
 * чего ждут от читалки. Правилами, а не перечнем доменов: банков и почтовых сервисов
 * в мире тысячи, поимённый список устарел бы в тот же день. Перечислены только те
 * крупные сервисы, под правила не попадающие.
 */
// ponytail: грубый фильтр, отключается флагом в настройках; при жалобах на ложные
// срабатывания — вести список отдельно от кода и обновлять без релиза
const SENSITIVE_HOSTS = [
  '127.0.0.1',
  'outlook.com',
  'outlook.live.com',
  'outlook.office.com',
  'proton.me',
  'protonmail.com',
  'web.telegram.org',
  'web.whatsapp.com',
  'paypal.com',
  'stripe.com',
  'wise.com',
  'revolut.com',
  'venmo.com',
  'klarna.com',
  'chase.com',
  'hsbc.com',
  'citi.com',
  'santander.com',
  'barclays.co.uk',
  'n26.com',
  'monzo.com',
  'tinkoff.ru',
  't-bank.ru',
]

/** Госуслуги любой страны: метка целиком, иначе `governor-blog.com` тоже стал бы госуслугой */
const SENSITIVE_LABELS = ['gov', 'govt']

export function isSensitiveHost(host: string): boolean {
  const clean = stripWww(host)
  // хост без точки — внутренняя сеть или сам компьютер, снаружи такого адреса нет
  if (!clean.includes('.')) return true

  const labels = clean.split('.')

  // первой меткой `mail` ходят и почтовые сервисы, и корпоративная почта
  if (labels[0] === 'mail') return true
  if (labels[labels.length - 1] === 'local') return true
  if (labels.some((label) => SENSITIVE_LABELS.includes(label))) return true
  // `bank` внутри метки: sberbank.ru, bankofamerica.com, rabobank.nl, зона .bank
  if (labels.some((label) => label.includes('bank'))) return true

  return SENSITIVE_HOSTS.some((entry) => clean === entry || clean.endsWith(`.${entry}`))
}

/**
 * Работает ли расширение на этом адресе. `allow` — только перечисленное,
 * `deny` — всё, кроме перечисленного; чувствительные адреса отсекает `guarded`,
 * а `trusted` возвращает из-под защиты то, что читатель разрешил сам: правило
 * грубое, и под него попадают сайты, где читать никто не запрещал.
 */
export function isSiteAllowed(
  url: string,
  mode: AccessMode,
  patterns: string[],
  guarded = true,
  trusted: string[] = [],
): boolean {
  const listed = patterns.some((pattern) => matchesSite(url, pattern))

  if (mode === 'allow') return listed
  if (listed) return false
  if (!guarded) return isValidUrl(url)

  try {
    if (!isSensitiveHost(new URL(url).host)) return true

    return trusted.some((pattern) => matchesSite(url, pattern))
  } catch {
    return false
  }
}
