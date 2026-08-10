import { onMounted, onUnmounted, ref, type Ref } from 'vue'
import { OVERLAY_ROOT_ID } from '@/utils/overlayRoot'

export type HoverHint = {
  /** Слово так, как оно написано в тексте страницы: карточку по нему собирает оверлей */
  term: string
  /** Координаты середины верхней грани слова, viewport */
  x: number
  y: number
}

/**
 * Слово под курсором, если оно подсвечено. Свой тултип вместо `title`:
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
    // события из shadow DOM ретаргетятся на хост: курсор в оверлее — подсказку
    // не гасим, иначе до кнопок карточки вкрапления не добраться
    if (event.target instanceof Element && event.target.id === OVERLAY_ROOT_ID) return

    const target = event.target instanceof Element
      ? event.target.closest('[data-nt-highlight="1"]')
      : null

    const term = target?.textContent?.trim()
    if (!target || !term) {
      hide()
      return
    }

    const rect = target.getBoundingClientRect()
    hint.value = { term, x: rect.left + rect.width / 2, y: rect.top }
  }

  // lifecycle
  onMounted((): void => {
    document.addEventListener('mouseover', onMouseOver)
    // координаты в системе viewport: при скролле подсказка уезжает от слова
    document.addEventListener('scroll', hide, true)
    // курсор ушёл за пределы страницы — `mouseover` больше не придёт, и подсказка бы зависла
    document.addEventListener('mouseleave', hide)
  })

  onUnmounted((): void => {
    document.removeEventListener('mouseover', onMouseOver)
    document.removeEventListener('scroll', hide, true)
    document.removeEventListener('mouseleave', hide)
  })

  return { hint }
}
