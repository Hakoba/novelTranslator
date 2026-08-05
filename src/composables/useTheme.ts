import { computed, watch, type WritableComputedRef, type Ref } from "vue"
import { useBrowserLocalStorage } from "./useBrowserStorage"

export type ThemeMode = "light" | "dark"

// один ref на весь контекст страницы — тему держим в browser.storage.local
const { data: mode } = useBrowserLocalStorage<ThemeMode>("theme-mode", "dark")

/** Класс .dark на <html> — его же слушает PrimeVue (darkModeSelector) и Tailwind */
export function applyTheme(target: HTMLElement = document.documentElement): void {
  target.classList.toggle("dark", mode.value === "dark")
}

watch(mode, () => applyTheme())

export function useTheme(): {
  mode: Ref<ThemeMode>
  isDark: WritableComputedRef<boolean>
  toggleDark: () => void
} {
  const isDark = computed<boolean>({
    get: () => mode.value === "dark",
    set: (value) => {
      mode.value = value ? "dark" : "light"
    },
  })

  function toggleDark(): void {
    isDark.value = !isDark.value
  }

  return { mode, isDark, toggleDark }
}
