import { onMounted, onUnmounted, ref, type Ref } from 'vue'
import { OVERLAY_ROOT_ID } from '@/utils/overlayRoot'
import { findSentence } from '@/utils/sentence'

export type SelectionAnchor = {
  text: string
  /** Предложение вокруг выделения — контекст для карточки словаря */
  context?: string
  /** Координаты середины верхней грани выделения, viewport */
  x: number
  y: number
}

/** Длиннее — это уже абзац, а не слово или фраза для словаря */
const MAX_SELECTION_LENGTH = 200

/**
 * Контекст ищем в ближайшем абзаце, а не в разобранном тексте главы: разбора
 * может и не быть, а поиск по всей главе нашёл бы первое вхождение слова —
 * запросто из другого места. Чтение `textContent` одного абзаца ничего не стоит.
 */
const TEXT_BLOCKS = 'p, li, blockquote, dd, td, h1, h2, h3, h4, h5, h6'

function contextAround(element: Element | null, term: string): string | undefined {
  const block = element?.closest(TEXT_BLOCKS) ?? element
  const text = block?.textContent?.replace(/\s+/g, ' ').trim()

  return text ? findSentence(text, term) : undefined
}

/**
 * События из shadow root оверлея на уровне document приходят с target = host,
 * поэтому по нему и отличаем свои клики от кликов по странице. Без этого клик
 * по кнопке «в словарь» сбрасывал бы выделение раньше, чем успевал сработать.
 */
function isFromOverlay(event: Event): boolean {
  return event.target instanceof Element && Boolean(event.target.closest(`#${OVERLAY_ROOT_ID}`))
}

function readSelection(): SelectionAnchor | undefined {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed || !selection.rangeCount) return undefined

  const text = selection.toString().replace(/\s+/g, ' ').trim()
  if (!text || text.length > MAX_SELECTION_LENGTH) return undefined

  const range = selection.getRangeAt(0)
  const container = range.commonAncestorContainer
  const element = container instanceof Element ? container : container.parentElement
  // выделение внутри самого оверлея кнопку вызывать не должно
  if (element?.closest(`#${OVERLAY_ROOT_ID}`)) return undefined

  const rect = range.getBoundingClientRect()

  return {
    text,
    context: contextAround(element, text),
    x: rect.left + rect.width / 2,
    y: rect.top,
  }
}

/** Выделенная на странице фраза и место, куда повесить кнопку «в словарь» */
export function useTextSelection(): {
  anchor: Ref<SelectionAnchor | undefined>
  clearSelection: () => void
} {
  // state
  const anchor = ref<SelectionAnchor | undefined>(undefined)

  // методы
  function clearSelection(): void {
    anchor.value = undefined
  }

  function onMouseUp(event: MouseEvent): void {
    if (isFromOverlay(event)) return
    anchor.value = readSelection()
  }

  function onMouseDown(event: MouseEvent): void {
    // новое выделение начинается — старая кнопка больше не про него
    if (!isFromOverlay(event)) clearSelection()
  }

  function onScroll(event: Event): void {
    // координаты кнопки в системе viewport: при скролле страницы она уезжает от текста
    if (!isFromOverlay(event)) clearSelection()
  }

  // lifecycle
  onMounted((): void => {
    document.addEventListener('mouseup', onMouseUp)
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('scroll', onScroll, true)
  })

  onUnmounted((): void => {
    document.removeEventListener('mouseup', onMouseUp)
    document.removeEventListener('mousedown', onMouseDown)
    document.removeEventListener('scroll', onScroll, true)
  })

  return { anchor, clearSelection }
}
