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
// cursor:help, а не pointer: клик по слову ничего не делает, есть только тултип
const BASE_STYLE = 'color:inherit;border-radius:2px;padding:0 2px;cursor:help'

const STYLES: Record<HighlightVariant, string> = {
  new: `background:rgba(250,204,21,.35);${BASE_STYLE}`,
  saved: `background:rgba(34,197,94,.32);${BASE_STYLE}`,
}

export type HighlightVariant = 'new' | 'saved'

function createMark(text: string, variant: HighlightVariant): HTMLElement {
  const mark = document.createElement('mark')
  mark.className = 'nt-highlight'
  mark.setAttribute('data-nt-highlight', '1')
  mark.style.cssText = STYLES[variant]
  mark.textContent = text

  return mark
}

/** Разбираем узел за один проход: собираем фрагмент и меняем его на исходный узел целиком */
function highlightNode(
  node: Text,
  pattern: RegExp,
  variants: HighlightVariant[],
): void {
  const text = node.nodeValue ?? ''
  pattern.lastIndex = 0

  const fragment = document.createDocumentFragment()
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) fragment.append(text.slice(lastIndex, match.index))

    const variant = variants[matchedGroupIndex(match)] ?? 'new'
    fragment.append(createMark(match[0], variant))
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

    // вкрапление: внутри метки чужое слово, наружу должен вернуться оригинал
    const original = el.getAttribute(ORIGINAL_ATTR)
    if (original !== null) {
      el.replaceWith(original)
    } else {
      while (el.firstChild) parent.insertBefore(el.firstChild, el)
      parent.removeChild(el)
    }
    parent.normalize()
  })
}

export type HighlightGroup = {
  terms: string[]
  variant: HighlightVariant
}

/**
 * Все группы ищутся одним проходом: цвет определяется тем, какая скобка шаблона
 * сработала. Проходить по очереди нельзя — второй проход получил бы уже
 * нарезанный текст и проверял границу слова не по тому символу.
 */
export function highlightTerms(groups: HighlightGroup[]): void {
  const active = groups
    .map((group) => ({ variant: group.variant, terms: normalizeTerms(group.terms) }))
    .filter((group) => group.terms.length)

  const source = buildTermsPattern(active.map((group) => group.terms))
  if (!source) return

  const pattern = new RegExp(source, 'giu')
  const variants = active.map((group) => group.variant)

  // список узлов снимаем заранее: замена узла на фрагмент ломает живой обход
  for (const node of walkTextNodes(document.body)) {
    highlightNode(node, pattern, variants)
  }
}

// Вкрапления: вместо словоформы страницы — слово из словаря, оригинал в атрибуте
const ORIGINAL_ATTR = 'data-nt-original'

export type Replacement = {
  /** Словоформа на странице */
  form: string
  /** Слово из словаря, которое встанет на её место */
  text: string
}

/**
 * Заменяет первое вхождение каждой словоформы меткой с изучаемым словом.
 * В отличие от подсветки здесь меняется сам текст страницы, поэтому ссылки,
 * код и редактируемые области не трогаем — подсветке в них можно.
 */
export function replaceTerms(replacements: Replacement[]): void {
  const source = buildTermsPattern(replacements.map((item) => [item.form]))
  if (!source) return

  const pattern = new RegExp(source, 'giu')
  // каждой словоформе — одно вхождение: заменённая выбывает из ожидания
  const pending = new Map(replacements.map((item, index) => [index, item]))

  for (const node of walkTextNodes(document.body)) {
    if (!pending.size) return

    const parent = node.parentElement
    if (!parent || parent.isContentEditable || parent.closest('a, pre, code, textarea')) continue

    replaceInNode(node, pattern, pending)
  }
}

function replaceInNode(node: Text, pattern: RegExp, pending: Map<number, Replacement>): void {
  const text = node.nodeValue ?? ''
  pattern.lastIndex = 0

  const fragment = document.createDocumentFragment()
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    const replacement = pending.get(matchedGroupIndex(match))
    // уже заменённая словоформа: вхождение остаётся обычным текстом
    if (!replacement) continue

    pending.delete(matchedGroupIndex(match))
    if (match.index > lastIndex) fragment.append(text.slice(lastIndex, match.index))

    const mark = createMark(replacement.text, 'saved')
    mark.setAttribute(ORIGINAL_ATTR, match[0])
    fragment.append(mark)
    lastIndex = match.index + match[0].length
  }

  if (!lastIndex) return
  if (lastIndex < text.length) fragment.append(text.slice(lastIndex))

  node.parentNode?.replaceChild(fragment, node)
}

/** Ответ получен: вкрапление раскрывается обратно в оригинальную словоформу */
export function restoreReplacement(term: string): void {
  const key = normalizeTerm(term)
  const marks = Array.from(document.querySelectorAll(`[${ORIGINAL_ATTR}]`))
  const mark = marks.find((item) => normalizeTerm(item.textContent ?? '') === key)
  if (!mark) return

  const parent = mark.parentNode
  mark.replaceWith(mark.getAttribute(ORIGINAL_ATTR) ?? '')
  parent?.normalize()
}

/** Сколько времени горит вспышка после перехода к слову */
const FLASH_MS = 500

// сколько раз к слову уже переходили: повторный клик ведёт к следующему вхождению
const visits = new Map<string, number>()

/**
 * Слова, которые горят прямо сейчас, с их настоящим стилем. Без этого повторный
 * переход к тому же слову внутри полусекунды принял бы за исходный стиль саму
 * вспышку — и слово осталось бы синим навсегда.
 */
const flashing = new WeakMap<HTMLElement, { original: string; timer: ReturnType<typeof setTimeout> }>()

function flash(mark: HTMLElement, calm: boolean): void {
  const pending = flashing.get(mark)
  if (pending) clearTimeout(pending.timer)

  const original = pending?.original ?? mark.style.cssText
  const fade = calm ? '' : 'transition:background-color .2s ease,box-shadow .2s ease;'
  mark.style.cssText = `${original};${fade}background:rgba(59,130,246,.55);box-shadow:0 0 0 4px rgba(59,130,246,.35)`

  const timer = setTimeout(() => {
    mark.style.cssText = original
    flashing.delete(mark)
  }, FLASH_MS)

  flashing.set(mark, { original, timer })
}

function occurrences(term: string): HTMLElement[] {
  const key = normalizeTerm(term)

  return Array.from(document.querySelectorAll<HTMLElement>('[data-nt-highlight="1"]'))
    .filter((mark) => normalizeTerm(mark.textContent ?? '') === key)
}

export function hasOccurrence(term: string): boolean {
  return occurrences(term).length > 0
}

/**
 * Прокручивает страницу к слову и коротко подсвечивает его. Каждый следующий
 * вызов ведёт к следующему вхождению — слово в главе встречается не по разу.
 *
 * Вспышка — инлайновым стилем с `transition`: своего CSS в документе сайта нет,
 * а `@keyframes` без таблицы стилей не объявить.
 */
export function revealTerm(term: string): void {
  const found = occurrences(term)
  if (!found.length) return

  const visit = visits.get(normalizeTerm(term)) ?? 0
  visits.set(normalizeTerm(term), visit + 1)

  const mark = found[visit % found.length]
  if (!mark) return

  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  mark.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'center' })
  flash(mark, calm)
}
