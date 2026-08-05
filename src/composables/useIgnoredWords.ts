import type { Ref } from 'vue'
import { useBrowserLocalStorage } from './useBrowserStorage'
import { normalizeTerm } from '@/utils/dictionary'

/**
 * Слова, которые модель находит, а читатель видеть не хочет: имена, термины,
 * давно знакомое. В словарь их класть незачем — там они попали бы в тренировку
 * и в экспорт, поэтому список отдельный.
 */
const { data, promise } = useBrowserLocalStorage<string[]>('IGNORED_WORDS', [])

export function useIgnoredWords(): {
  ignored: Ref<string[]>
  promise: Promise<unknown>
  isIgnored: (term: string) => boolean
  ignoreWord: (term: string) => void
  restoreWord: (term: string) => void
} {
  // методы
  function isIgnored(term: string): boolean {
    const key = normalizeTerm(term)

    return data.value.some((item) => normalizeTerm(item) === key)
  }

  function ignoreWord(term: string): void {
    if (isIgnored(term)) return

    data.value.push(term)
  }

  /** Без записи слово снова показывается — надгробие тут не нужно */
  function restoreWord(term: string): void {
    const key = normalizeTerm(term)
    data.value = data.value.filter((item) => normalizeTerm(item) !== key)
  }

  return { ignored: data, promise, isIgnored, ignoreWord, restoreWord }
}
