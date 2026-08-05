// Правила для сайтов, где общий алгоритм промахивается. Без DOM — тестируется в node.

export type SiteRule = {
  /** Домен без www; правило берёт и поддомены */
  host: string
  /** Контейнеров может быть несколько: у reddit пост и каждый комментарий — отдельный узел */
  selectors: string[]
}

export const SITE_RULES: SiteRule[] = [
  {
    // на reddit нет ни article, ни main: пост и ветка комментариев живут в веб-компонентах
    host: 'reddit.com',
    selectors: [
      'shreddit-post [slot="text-body"]',
      'shreddit-comment [slot="comment"]',
      '[data-testid="post-container"]',
    ],
  },
  {
    host: 'webnovel.com',
    selectors: ['.cha-words', '.cha-content'],
  },
  {
    host: 'novelbin.com',
    selectors: ['#chr-content', '.chr-c'],
  },
  {
    host: 'royalroad.com',
    selectors: ['.chapter-inner'],
  },
]

export function normalizeHost(host: string): string {
  return host.toLowerCase().replace(/^www\./, '')
}

export function findRule(host: string): SiteRule | undefined {
  const normalized = normalizeHost(host)

  return SITE_RULES.find(
    (rule) => normalized === rule.host || normalized.endsWith(`.${rule.host}`),
  )
}
