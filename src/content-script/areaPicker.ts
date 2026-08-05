import { OVERLAY_ROOT_ID } from '@/utils/overlayRoot'

/**
 * Ручной выбор области с текстом: алгоритм и правила промахиваются на сайтах
 * с нестандартной вёрсткой, и без этого режима пользователю нечего сделать.
 */

const OUTLINE = '2px solid rgba(59,130,246,.9)'

function isInsideOverlay(element: Element): boolean {
  return Boolean(element.closest(`#${OVERLAY_ROOT_ID}`))
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
  let previousOutline = ''
  let isStopped = false
  const previousCursor = document.documentElement.style.cursor

  function unhighlight(): void {
    if (!(hovered instanceof HTMLElement)) return
    hovered.style.outline = previousOutline
    hovered = undefined
  }

  function highlight(element: Element): void {
    if (element === hovered) return
    unhighlight()
    if (!(element instanceof HTMLElement)) return

    previousOutline = element.style.outline
    // инлайном, а не классом: своего CSS в документ сайта мы не добавляем
    element.style.outline = OUTLINE
    hovered = element
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
    document.documentElement.style.cursor = previousCursor
    document.removeEventListener('mousemove', onMouseMove, true)
    document.removeEventListener('click', onClick, true)
    document.removeEventListener('keydown', onKeyDown, true)

    onDone(selector)
  }

  document.documentElement.style.cursor = 'crosshair'
  document.addEventListener('mousemove', onMouseMove, true)
  document.addEventListener('click', onClick, true)
  document.addEventListener('keydown', onKeyDown, true)

  return stop
}
