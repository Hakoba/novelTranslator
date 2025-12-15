import { computed, ref } from 'vue'
import type { WordWithExplanation } from '@/types/words'
import { requestDifficultWords } from '@/utils/llmClient'
import { extractReadableText } from '@/utils/pageText'

export function useDifficultWords() {
  // state
  const words = ref<WordWithExplanation[]>([])
  const isLoading = ref<boolean>(false)

  // computed
  const wordsCount = computed<number>(() => words.value.length)

  // methods
  async function fetchDifficultWords(text?: string): Promise<void> {
    isLoading.value = true
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 15000)
      const sourceText = typeof text === 'string' && text.trim() ? text : extractReadableText()
      if (!sourceText) {
        clearTimeout(timer)
        words.value = []
        return
      }
      const items = await requestDifficultWords(sourceText, controller.signal)
      clearTimeout(timer)
      words.value = items
    } catch {
      words.value = []
    } finally {
      isLoading.value = false
    }
  }

  return {
    // state
    words,
    isLoading,
    // computed
    wordsCount,
    // methods
    fetchDifficultWords,
  }
}
