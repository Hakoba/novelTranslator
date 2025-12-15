type Predicate<T> = (value: T) => boolean

function isElement(node: Node): node is Element {
  return node.nodeType === Node.ELEMENT_NODE
}
function isText(node: Node): node is Text {
  return node.nodeType === Node.TEXT_NODE
}

function isInsideOverlay(node: Node): boolean {
  let cur: Node | null = isElement(node) ? node : node.parentNode
  while (cur) {
    if (isElement(cur) && cur.id === 'novel-translator-overlay-root') return true
    cur = cur.parentNode
  }
  return false
}

function shouldSkipElement(el: Element): boolean {
  const tag = el.tagName
  if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'CANVAS', 'IMG', 'VIDEO', 'AUDIO', 'IFRAME'].includes(tag)) return true
  const role = el.getAttribute('role')
  if (role && (role.includes('navigation') || role.includes('search') || role.includes('banner'))) return true
  const ariaHidden = el.getAttribute('aria-hidden') === 'true'
  const cs = getComputedStyle(el)
  const hidden = cs.display === 'none' || cs.visibility === 'hidden'
  return ariaHidden || hidden
}

function walkTextNodes(root: Node, predicate?: Predicate<Text>): Text[] {
  const result: Text[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
  while (true) {
    const node = walker.nextNode()
    if (!node) break
    if (isElement(node)) {
      if (shouldSkipElement(node)) walker.currentNode = node // continue; children will be skipped by style but keep walking
      continue
    }
    if (isText(node)) {
      const parent = node.parentElement
      if (!parent) continue
      if (isInsideOverlay(parent)) continue
      if (parent.getAttribute('data-nt-highlight') === '1') continue
      const text = node.nodeValue || ''
      if (text.trim().length === 0) continue
      if (!predicate || predicate(node)) result.push(node)
    }
  }
  return result
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getUniqueTerms(terms: string[]): string[] {
  const set = new Set<string>()
  for (const t of terms) {
    const v = t.trim()
    if (v) set.add(v)
  }
  // сортируем по длине убыв., чтобы фразы подсвечивались прежде коротких слов
  return Array.from(set).sort((a, b) => b.length - a.length)
}

export function clearHighlights(): void {
  const nodes = document.querySelectorAll('[data-nt-highlight="1"]')
  nodes.forEach((el) => {
    const parent = el.parentNode
    if (!parent) return
    while (el.firstChild) parent.insertBefore(el.firstChild, el)
    parent.removeChild(el)
    parent.normalize()
  })
}

export function highlightTerms(terms: string[]): void {
  clearHighlights()
  const unique = getUniqueTerms(terms)
  if (!unique.length) return

  const patterns = unique.map((t) => ({
    term: t,
    re: new RegExp(escapeRegExp(t), 'gi'),
  }))

  const textNodes = walkTextNodes(document.body)
  for (const tn of textNodes) {
    let node: Text | null = tn
    for (const { re } of patterns) {
      if (!node) break
      let match: RegExpExecArray | null
      // we need to repeatedly find matches on current text node
      while (true) {
        const text = node?.nodeValue || ''
        re.lastIndex = 0
        match = re.exec(text)
        if (!match || match.index < 0) break
        const start = match.index
        const end = start + match[0].length
        const before = text.slice(0, start)
        const middle = text.slice(start, end)
        const after = text.slice(end)

        const mark = document.createElement('mark')
        mark.className = 'nt-highlight'
        mark.setAttribute('data-nt-highlight', '1')
        mark.textContent = middle

        const parent = node?.parentNode
        if (!parent) break
        if (before) parent.insertBefore(document.createTextNode(before), node)
        parent.insertBefore(mark, node)
        if (after) parent.insertBefore(document.createTextNode(after), node)
        parent.removeChild(node as Text)

        // continue on the tail text node (after)
        const nextNode = mark.nextSibling
        node = nextNode && isText(nextNode) ? nextNode : null
        // loop will search re again on the new node
      }
    }
  }
}
