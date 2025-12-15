const TEXT_TAGS = ['P', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE'] as const
const CONTAINER_SELECTORS = ['article', 'main', '[role="main"]', '.chapter-content', '.entry-content', '#content'] as const
const MIN_LINE_LENGTH = 30
const MAX_CHARS = 8000

function isElement(node: Node): node is Element {
  return node.nodeType === Node.ELEMENT_NODE
}

function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, ' ').trim()
}

export function extractReadableText(): string {
  // 1. Попробуем найти основной контейнер контента
  let root: Element | Document = document
  for (const sel of CONTAINER_SELECTORS) {
    const el = document.querySelector(sel)
    if (el) {
      root = el
      break
    }
  }

  // 2. Собираем текстовые блоки
  const blocks: string[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)
  while (true) {
    const node = walker.nextNode()
    if (!node) break

    // Пропускаем скрытые/служебные элементы
    const parentEl = node.parentElement
    if (parentEl) {
      const tag = parentEl.tagName
      const isHidden = parentEl.getAttribute('aria-hidden') === 'true' || getComputedStyle(parentEl).display === 'none' || getComputedStyle(parentEl).visibility === 'hidden'
      if (isHidden) continue
      // Исключаем элементы навигации и пр.
      const role = parentEl.getAttribute('role')
      if (role && (role.includes('navigation') || role.includes('search') || role.includes('banner'))) continue
      const unwanted = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'CANVAS', 'IMG', 'VIDEO', 'AUDIO']
      if (unwanted.includes(tag)) continue
    }

    if (node.nodeType === Node.TEXT_NODE) {
      const text = normalizeWhitespace(node.nodeValue ?? '')
      if (text.length >= MIN_LINE_LENGTH) blocks.push(text)
      continue
    }

    if (isElement(node)) {
      const tag = node.tagName
      if ((TEXT_TAGS as readonly string[]).includes(tag)) {
        const text = normalizeWhitespace(node.textContent ?? '')
        if (text.length >= MIN_LINE_LENGTH) blocks.push(text)
      }
    }
  }

  // 3. Склеим и ограничим размер
  const joined = blocks.join('\n')
  return joined.length > MAX_CHARS ? joined.slice(0, MAX_CHARS) : joined
}
