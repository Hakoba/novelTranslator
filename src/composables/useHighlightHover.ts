import { onMounted, onUnmounted, ref, type Ref } from 'vue'
import { TRANSLATE_ATTR } from '@/utils/highlight'

export type HoverHint = {
  translate: string
  /** Координаты середины верхней грани слова, viewport */
  x: number
  y: number
}

/**
 * Перевод под курсором для подсвеченного слова. Свой тултип вместо `title`:
 * нативный появляется примерно через секунду, и настроить эту задержку нельзя.
 *
 * Слушатель один: `mouseover` всплывает и приходит и при уходе на соседний элемент,
 * так что подсказка гаснет сама, без парного `mouseout`.
 */
export function useHighlightHover(): { hint: Ref<HoverHint | undefined> } {
  // state
  const hint = ref<HoverHint | undefined>(undefined)

  // методы
  function hide(): void {
    hint.value = undefined
  }

  function onMouseOver(event: MouseEvent): void {
    const target = event.target instanceof Element
      ? event.target.closest(`mark[${TRANSLATE_ATTR}]`)
      : null

    if (!target) {
      hide()
      return
    }

    const translate = target.getAttribute(TRANSLATE_ATTR)
    if (!translate) {
      hide()
      return
    }

    const rect = target.getBoundingClientRect()
    hint.value = { translate, x: rect.left + rect.width / 2, y: rect.top }
  }

  // lifecycle
  onMounted((): void => {
    document.addEventListener('mouseover', onMouseOver)
    // координаты в системе viewport: при скролле подсказка уезжает от слова
    document.addEventListener('scroll', hide, true)
  })

  onUnmounted((): void => {
    document.removeEventListener('mouseover', onMouseOver)
    document.removeEventListener('scroll', hide, true)
  })

  return { hint }
}
