import { ref, type Ref } from 'vue'
import type { WordWithExplanation } from '@/types/words'
import { REQUEST_TIMEOUT_MS, requestDifficultWords } from '@/utils/llmClient'
import { extractReadableText } from '@/utils/pageText'
import { t } from '@/utils/i18n'

export function useDifficultWords(): {
  words: Ref<WordWithExplanation[]>
  sourceText: Ref<string>
  isLoading: Ref<boolean>
  errorMessage: Ref<string>
  fetchDifficultWords: (text?: string) => Promise<void>
} {
  // state
  const words = ref<WordWithExplanation[]>([])
  // держим разобранный текст: из него достаётся предложение-контекст для словаря
  const sourceText = ref<string>('')
  const isLoading = ref<boolean>(false)
  const errorMessage = ref<string>('')
  // выбор области перезапускает разбор, пока предыдущий ещё висит: без номера
  // запроса поздний ответ первого затирает результат второго
  let currentRequest = 0

  // методы
  async function fetchDifficultWords(text?: string): Promise<void> {
    const request = ++currentRequest
    const parsedText = typeof text === 'string' && text.trim() ? text : await extractReadableText()
    if (request !== currentRequest) return

    words.value = []
    errorMessage.value = ''
    sourceText.value = ''

    if (!parsedText) {
      errorMessage.value = t('errors.noText')
      return
    }

    sourceText.value = parsedText

    isLoading.value = true

    try {
      const result = await requestDifficultWords(parsedText)
      if (request === currentRequest) words.value = result
    } catch (error) {
      if (request !== currentRequest) return

      // без текста ошибки непонятно, модель не отвечает или ответ не распарсился
      errorMessage.value = error instanceof DOMException && error.name === 'AbortError'
        ? t('errors.timeout', { seconds: REQUEST_TIMEOUT_MS / 1000 })
        : error instanceof Error ? error.message : t('errors.llmUnknown')
    } finally {
      if (request === currentRequest) isLoading.value = false
    }
  }

  return {
    words,
    sourceText,
    isLoading,
    errorMessage,
    fetchDifficultWords,
  }
}
