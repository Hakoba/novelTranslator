import { normalizeTerm } from './dictionary'
import { OVERLAY_ROOT_ID } from './overlayRoot'
import { buildTermsPattern, matchedGroupIndex, normalizeTerms } from './terms'

function isElement(node: Node): node is Element {
  return node.nodeType === Node.ELEMENT_NODE
}
function isText(node: Node): node is Text {
  return node.nodeType === Node.TEXT_NODE
}

function isInsideOverlay(node: Node): boolean {
  const element = isElement(node) ? node : node.parentElement

  return Boolean(element?.closest(`#${OVERLAY_ROOT_ID}`))
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

function walkTextNodes(root: Node): Text[] {
  const result: Text[] = []
  // FILTER_REJECT отсекает всё поддерево: иначе обход спускается внутрь script и style
  // и подсветка встраивает <mark> прямо в их содержимое
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node: Node): number => {
      if (isElement(node)) {
        return shouldSkipElement(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP
      }

      return NodeFilter.FILTER_ACCEPT
    },
  })

  while (true) {
    const node = walker.nextNode()
    if (!node) break
    if (!isText(node)) continue

    const parent = node.parentElement
    if (!parent) continue
    if (isInsideOverlay(parent)) continue
    if (parent.getAttribute('data-nt-highlight') === '1') continue
    if ((node.nodeValue ?? '').trim().length === 0) continue

    result.push(node)
  }

  return result
}

/** Инлайном, а не классом: подсветка живёт в документе сайта, своего CSS мы туда не добавляем */
/** Перевод для тултипа: читает `useHighlightHover` при наведении */
export const TRANSLATE_ATTR = 'data-nt-translate'

// cursor:help, а не pointer: клик по слову ничего не делает, есть только тултип
const BASE_STYLE = 'color:inherit;border-radius:2px;padding:0 2px;cursor:help'

const STYLES: Record<HighlightVariant, string> = {
  new: `background:rgba(250,204,21,.35);${BASE_STYLE}`,
  saved: `background:rgba(34,197,94,.32);${BASE_STYLE}`,
}

export type HighlightVariant = 'new' | 'saved'

function createMark(text: string, variant: HighlightVariant, title?: string): HTMLElement {
  const mark = document.createElement('mark')
  mark.className = 'nt-highlight'
  mark.setAttribute('data-nt-highlight', '1')
  mark.style.cssText = STYLES[variant]
  // не `title`: нативный тултип ждёт около секунды, а свой оверлей рисует сразу
  if (title) mark.setAttribute(TRANSLATE_ATTR, title)
  mark.textContent = text

  return mark
}

/** Разбираем узел за один проход: собираем фрагмент и меняем его на исходный узел целиком */
function highlightNode(
  node: Text,
  pattern: RegExp,
  variants: HighlightVariant[],
  titles: Map<string, string>,
): void {
  const text = node.nodeValue ?? ''
  pattern.lastIndex = 0

  const fragment = document.createDocumentFragment()
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) fragment.append(text.slice(lastIndex, match.index))

    const variant = variants[matchedGroupIndex(match)] ?? 'new'
    fragment.append(createMark(match[0], variant, titles.get(normalizeTerm(match[0]))))
    lastIndex = match.index + match[0].length
  }

  if (!lastIndex) return
  if (lastIndex < text.length) fragment.append(text.slice(lastIndex))

  node.parentNode?.replaceChild(fragment, node)
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

export type HighlightTerm = {
  text: string
  /** Показывается в тултипе при наведении */
  translate?: string
}

export type HighlightGroup = {
  terms: HighlightTerm[]
  variant: HighlightVariant
}

/**
 * Все группы ищутся одним проходом: цвет определяется тем, какая скобка шаблона
 * сработала. Проходить по очереди нельзя — второй проход получил бы уже
 * нарезанный текст и проверял границу слова не по тому символу.
 */
export function highlightTerms(groups: HighlightGroup[]): void {
  const active = groups
    .map((group) => ({
      variant: group.variant,
      terms: normalizeTerms(group.terms.map((term) => term.text)),
    }))
    .filter((group) => group.terms.length)

  const source = buildTermsPattern(active.map((group) => group.terms))
  if (!source) return

  const pattern = new RegExp(source, 'giu')
  const variants = active.map((group) => group.variant)
  // по нормализованному тексту: в тексте слово встретится и с заглавной, и в другом отступе
  const titles = new Map<string, string>(
    groups
      .flatMap((group) => group.terms)
      .filter((term) => term.translate)
      .map((term) => [normalizeTerm(term.text), term.translate ?? '']),
  )

  // список узлов снимаем заранее: замена узла на фрагмент ломает живой обход
  for (const node of walkTextNodes(document.body)) {
    highlightNode(node, pattern, variants, titles)
  }
}
