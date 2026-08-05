import { computed, ref, type ComputedRef, type Ref } from 'vue'
import type { WordWithExplanation } from '@/types/words'
import { requestDifficultWords } from '@/utils/llmClient'
import { extractReadableText } from '@/utils/pageText'

const REQUEST_TIMEOUT_MS = 15000

export function useDifficultWords(): {
  words: Ref<WordWithExplanation[]>
  isLoading: Ref<boolean>
  errorMessage: Ref<string>
  wordsCount: ComputedRef<number>
  fetchDifficultWords: (text?: string) => Promise<void>
} {
  // state
  const words = ref<WordWithExplanation[]>([])
  const isLoading = ref<boolean>(false)
  const errorMessage = ref<string>('')

  // computed
  const wordsCount = computed<number>(() => words.value.length)

  // методы
  async function fetchDifficultWords(text?: string): Promise<void> {
    const sourceText = typeof text === 'string' && text.trim() ? text : extractReadableText()

    words.value = []
    errorMessage.value = ''

    if (!sourceText) {
      errorMessage.value = 'На странице не нашлось текста главы'
      return
    }

    isLoading.value = true
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      words.value = await requestDifficultWords(sourceText, controller.signal)
    } catch (error) {
      // без текста ошибки непонятно, модель не отвечает или ответ не распарсился
      errorMessage.value = error instanceof Error ? error.message : 'Не удалось получить ответ модели'
    } finally {
      clearTimeout(timer)
      isLoading.value = false
    }
  }

  return {
    words,
    isLoading,
    errorMessage,
    wordsCount,
    fetchDifficultWords,
  }
}
