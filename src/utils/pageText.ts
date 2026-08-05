const TEXT_TAGS = 'p, li, h1, h2, h3, h4, h5, h6, blockquote'
const CONTAINER_SELECTORS = [
  '.cha-words',
  '.cha-content',
  '#chapterContent',
  '.chapter-content',
  '.chr-c',
  '#chr-content',
  '.entry-content',
  'article',
  'main',
  '[role="main"]',
] as const
const MIN_LINE_LENGTH = 30
const MAX_CHARS = 8000

function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, ' ').trim()
}

/**
 * Одна и та же строка приходит несколько раз: сайты дублируют абзацы в скрытых
 * блоках, а вложенные li/p дают текст родителя ещё раз. Модели это стоит токенов.
 */
export function dedupeBlocks(blocks: string[]): string[] {
  const seen = new Set<string>()

  return blocks.filter((block) => {
    if (seen.has(block)) return false
    seen.add(block)

    return true
  })
}

/** Из кандидатов берём тот, в котором больше всего текста абзацев — это и есть глава */
function findContentRoot(): Element {
  const candidates = CONTAINER_SELECTORS.flatMap((selector) =>
    Array.from(document.querySelectorAll(selector)),
  )

  let best: Element = document.body
  let bestLength = 0

  for (const candidate of candidates) {
    const length = Array.from(candidate.querySelectorAll(TEXT_TAGS))
      .reduce((sum, el) => sum + (el.textContent?.length ?? 0), 0)

    if (length > bestLength) {
      best = candidate
      bestLength = length
    }
  }

  return best
}

function isHidden(element: Element): boolean {
  if (element.getAttribute('aria-hidden') === 'true') return true
  const styles = getComputedStyle(element)

  return styles.display === 'none' || styles.visibility === 'hidden'
}

export function extractReadableText(): string {
  const root = findContentRoot()

  const blocks = Array.from(root.querySelectorAll(TEXT_TAGS))
    // вложенный абзац отдаёт свой текст сам, иначе родитель продублирует его
    .filter((element) => !element.querySelector(TEXT_TAGS))
    .filter((element) => !isHidden(element))
    .map((element) => normalizeWhitespace(element.textContent ?? ''))
    .filter((text) => text.length >= MIN_LINE_LENGTH)

  const joined = dedupeBlocks(blocks).join('\n')

  return joined.length > MAX_CHARS ? joined.slice(0, MAX_CHARS) : joined
}
