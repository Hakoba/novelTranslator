import { computed, watchEffect, type Ref } from 'vue'
import { useBrowserLocalStorage } from './useBrowserStorage'

/** Развёрнутая панель и свёрнутый рельс: ровно на столько же ужимается страница */
export const DOCK_WIDTH = 380
export const RAIL_WIDTH = 48

// состояние глобальное, а не по сайтам: свернул один раз — панель не разворачивается
// сама на каждой новой вкладке
const { data, promise } = useBrowserLocalStorage<boolean>('OVERLAY_COLLAPSED', false)

/**
 * Единственное место, где расширение правит стили документа сайта, — и без него
 * панель не освобождала бы место, а закрывала текст: ужать страницу из content script
 * больше нечем. `important` обязателен, у сайтов встречается `html { margin: 0 !important }`.
 */
function insetPage(width: number): void {
  document.documentElement.style.setProperty('margin-right', `${width}px`, 'important')
}

/** Оверлей закрыли или сайт перестал быть разрешённым — страница забирает ширину назад */
export function releasePage(): void {
  document.documentElement.style.removeProperty('margin-right')
}

export function useOverlayDock(): {
  isCollapsed: Ref<boolean>
  width: Ref<number>
  promise: Promise<unknown>
} {
  // со сборкой под боковую панель браузера док не рисуется: место ему не нужно,
  // и карточки отсчитывают правый край прямо от окна
  const width = computed<number>(() => {
    if (__HAS_SIDE_PANEL__) return 0

    return data.value ? RAIL_WIDTH : DOCK_WIDTH
  })

  // эффект живёт в скоупе компонента и умирает вместе с ним, но отступ не снимает:
  // при переходе внутри SPA оверлей пересоздаётся, и сайт иначе дёргался бы вёрсткой
  watchEffect(() => {
    if (!__HAS_SIDE_PANEL__) insetPage(width.value)
  })

  return { isCollapsed: data, width, promise }
}
