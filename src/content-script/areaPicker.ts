import { OVERLAY_ROOT_ID } from '@/utils/overlayRoot'

/**
 * Ручной выбор области с текстом: алгоритм и правила промахиваются на сайтах
 * с нестандартной вёрсткой, и без этого режима пользователю нечего сделать.
 */

/** Инлайном, а не классом: своего CSS в документ сайта мы не добавляем */
const HIGHLIGHT = [
  'outline:2px solid rgba(59,130,246,.95)',
  'outline-offset:-2px',
  'background-color:rgba(59,130,246,.12)',
].join(';')

/**
 * Четыре шторки вокруг блока вместо `box-shadow` на нём самом: тень режется
 * первым же предком с `overflow: hidden`, а фиксированные шторки видны всегда.
 */
const SHADE_STYLE = [
  'position:fixed',
  'z-index:2147483646',
  'pointer-events:none',
  'background:rgba(0,0,0,.45)',
  'display:none',
].join(';')

const PANEL_STYLE = [
  'position:fixed',
  'z-index:2147483647',
  'pointer-events:none',
  'padding:3px 8px',
  'border-radius:6px',
  'background:rgba(37,99,235,.95)',
  'color:#fff',
  'font:12px/1.5 ui-sans-serif,system-ui,sans-serif',
  'box-shadow:0 4px 14px rgba(0,0,0,.35)',
  'white-space:nowrap',
].join(';')

function isInsideOverlay(element: Element): boolean {
  return Boolean(element.closest(`#${OVERLAY_ROOT_ID}`))
}

function createPanel(): HTMLDivElement {
  const panel = document.createElement('div')
  panel.style.cssText = PANEL_STYLE

  return panel
}

function createShades(): HTMLDivElement[] {
  return Array.from({ length: 4 }, () => {
    const shade = document.createElement('div')
    shade.style.cssText = SHADE_STYLE

    return shade
  })
}

function placeShades([top, right, bottom, left]: HTMLDivElement[], rect: DOMRect): void {
  const width = document.documentElement.clientWidth
  const height = document.documentElement.clientHeight
  const box = {
    top: Math.max(0, rect.top),
    bottom: Math.min(height, rect.bottom),
    left: Math.max(0, rect.left),
    right: Math.min(width, rect.right),
  }

  const boxes = [
    { el: top, top: 0, left: 0, width, height: box.top },
    { el: right, top: box.top, left: box.right, width: width - box.right, height: box.bottom - box.top },
    { el: bottom, top: box.bottom, left: 0, width, height: height - box.bottom },
    { el: left, top: box.top, left: 0, width: box.left, height: box.bottom - box.top },
  ]

  for (const item of boxes) {
    item.el.style.top = `${item.top}px`
    item.el.style.left = `${item.left}px`
    item.el.style.width = `${Math.max(0, item.width)}px`
    item.el.style.height = `${Math.max(0, item.height)}px`
    item.el.style.display = 'block'
  }
}

/** Короткое имя блока для подписи: полный селектор длинный и читать его на лету незачем */
function describe(element: Element): string {
  const tag = element.tagName.toLowerCase()
  if (element.id) return `${tag}#${element.id}`

  const className = element.classList.item(0)

  return className ? `${tag}.${className}` : tag
}

/**
 * Селектор строим от ближайшего предка с id — так он переживает перерисовку
 * соседних блоков, в отличие от пути от самого body.
 */
function buildSelector(element: Element): string {
  if (element.id) return `#${CSS.escape(element.id)}`

  const parts: string[] = []
  let current: Element | null = element

  while (current && current !== document.body) {
    if (current.id) {
      parts.unshift(`#${CSS.escape(current.id)}`)
      break
    }

    const parent: Element | null = current.parentElement
    const tag = current.tagName.toLowerCase()

    if (!parent) {
      parts.unshift(tag)
      break
    }

    const twins = Array.from(parent.children).filter((child) => child.tagName === current?.tagName)
    parts.unshift(twins.length > 1 ? `${tag}:nth-of-type(${twins.indexOf(current) + 1})` : tag)
    current = parent
  }

  return parts.join(' > ')
}

/**
 * Наводим рамку на элемент под курсором, по клику отдаём его селектор.
 * `onDone` зовётся ровно один раз: с селектором при выборе и без него при отмене
 * (Escape или вызов возвращённой функции) — иначе кнопка режима залипает.
 */
export function startAreaPicker(onDone: (selector?: string) => void): () => void {
  let hovered: Element | undefined
  // весь атрибут целиком: свойств в подсветке несколько, а откат должен быть точным
  let previousStyle: string | null = null
  let isStopped = false
  const previousCursor = document.documentElement.style.cursor

  const hintPanel = createPanel()
  hintPanel.textContent = 'Кликните по блоку с текстом · Esc — отмена'
  hintPanel.style.top = '12px'
  hintPanel.style.left = '50%'
  hintPanel.style.transform = 'translateX(-50%)'

  const labelPanel = createPanel()
  labelPanel.style.display = 'none'

  const shades = createShades()

  function unhighlight(): void {
    if (!(hovered instanceof HTMLElement)) return

    if (previousStyle === null) hovered.removeAttribute('style')
    else hovered.setAttribute('style', previousStyle)

    hovered = undefined
    labelPanel.style.display = 'none'
    shades.forEach((shade) => { shade.style.display = 'none' })
  }

  function highlight(element: Element): void {
    if (element === hovered) return
    unhighlight()
    if (!(element instanceof HTMLElement)) return

    previousStyle = element.getAttribute('style')
    element.style.cssText = `${previousStyle ?? ''};${HIGHLIGHT}`
    hovered = element

    const chars = (element.textContent ?? '').trim().length
    labelPanel.textContent = `${describe(element)} · ${chars} симв.`
    const rect = element.getBoundingClientRect()
    placeShades(shades, rect)
    // над блоком, а если он у верхнего края экрана — сразу под его границей
    labelPanel.style.top = `${rect.top > 26 ? rect.top - 24 : rect.top + 4}px`
    labelPanel.style.left = `${Math.max(4, rect.left)}px`
    labelPanel.style.display = 'block'
  }

  function onMouseMove(event: MouseEvent): void {
    const element = document.elementFromPoint(event.clientX, event.clientY)
    if (element && !isInsideOverlay(element)) highlight(element)
  }

  function onClick(event: MouseEvent): void {
    const element = document.elementFromPoint(event.clientX, event.clientY)
    if (!element || isInsideOverlay(element)) return

    // клик по ссылке в тексте не должен уводить со страницы
    event.preventDefault()
    event.stopPropagation()

    stop(buildSelector(element))
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') stop()
  }

  function stop(selector?: string): void {
    if (isStopped) return
    isStopped = true

    unhighlight()
    hintPanel.remove()
    labelPanel.remove()
    shades.forEach((shade) => { shade.remove() })
    document.documentElement.style.cursor = previousCursor
    document.removeEventListener('mousemove', onMouseMove, true)
    document.removeEventListener('click', onClick, true)
    document.removeEventListener('keydown', onKeyDown, true)

    onDone(selector)
  }

  document.body.append(hintPanel, labelPanel, ...shades)
  document.documentElement.style.cursor = 'crosshair'
  document.addEventListener('mousemove', onMouseMove, true)
  document.addEventListener('click', onClick, true)
  document.addEventListener('keydown', onKeyDown, true)

  return stop
}
