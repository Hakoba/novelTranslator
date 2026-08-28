import { ref, type Ref } from 'vue'
import type { WordWithExplanation } from '@/types/words'
import { analyzeText } from '@/utils/analyze'
import { textToAnalyze } from '@/utils/extract/blocks'
import { REQUEST_TIMEOUT_MS } from '@/utils/llmClient'
import { extractReadableText } from '@/utils/pageText'
import { t } from '@/utils/i18n'

/**
 * Текст прошлого разбора — на уровне модуля, а не композабла: при переходе внутри
 * SPA оверлей пересоздаётся, а страница остаётся той же, и дописанный текст надо
 * отличить от уже разобранного. Живёт ровно столько, сколько content script.
 */
let analyzedText = ''

export function useDifficultWords(): {
  words: Ref<WordWithExplanation[]>
  sourceText: Ref<string>
  isLoading: Ref<boolean>
  errorMessage: Ref<string>
  fetchDifficultWords: (full?: boolean) => Promise<void>
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
  /** `full` — читать страницу с нуля, а не только дописанное: разбор просят повторить руками */
  async function fetchDifficultWords(full = false): Promise<void> {
    const request = ++currentRequest
    const pageText = await extractReadableText()
    if (request !== currentRequest) return

    // на странице с догрузкой разбирается только дописанное, иначе разбор упрётся
    // в уже разобранный текст: лимит символов отрезает его с конца
    const parsedText = textToAnalyze({
      full,
      pageText,
      analyzedText,
      lastChunk: sourceText.value,
      hasError: Boolean(errorMessage.value),
    })

    if (!pageText) {
      words.value = []
      sourceText.value = ''
      errorMessage.value = t('errors.noText')
      return
    }

    // Отправлять нечего. Разбор, который этот оверлей уже показал, не трогаем:
    // повторный проход ничего не добавил, а сообщение вместо готового списка
    // читается как поломка. Объясняем только там, где показывать нечего —
    // страницу сменили раньше, чем на ней появился новый текст
    if (!parsedText) {
      if (!sourceText.value) {
        words.value = []
        errorMessage.value = t('errors.noNewText')
      }

      return
    }

    words.value = []
    errorMessage.value = ''
    analyzedText = pageText
    sourceText.value = parsedText

    isLoading.value = true

    try {
      const result = await analyzeText(parsedText)
      if (request === currentRequest) {
        // отказ переводчика слова не отменяет: они найдены офлайн-профилем,
        // у них есть уровень и подсветка — пропадать им не за что
        words.value = result.words
        errorMessage.value = result.error ?? ''
      }
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
