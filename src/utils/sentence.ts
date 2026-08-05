// Поиск предложения-контекста. Без браузерных API — тестируется в node.

const SENTENCE_BREAK = /[.!?\n]/
const MAX_CONTEXT_LENGTH = 300

function findStart(text: string, from: number): number {
  for (let i = from; i > 0; i -= 1) {
    if (SENTENCE_BREAK.test(text[i - 1] ?? '')) return i
  }

  return 0
}

function findEnd(text: string, from: number): number {
  for (let i = from; i < text.length; i += 1) {
    // точку включаем в предложение, перевод строки — нет
    if (SENTENCE_BREAK.test(text[i] ?? '')) return text[i] === '\n' ? i : i + 1
  }

  return text.length
}

/**
 * Предложение, в котором встретилось слово, — контекст для карточки словаря.
 * Без него карточка учится хуже: перевод в отрыве от фразы забывается.
 */
export function findSentence(text: string, term: string): string | undefined {
  const needle = normalize(term)
  if (!needle || !text) return undefined

  const index = text.toLowerCase().indexOf(needle)
  if (index === -1) return undefined

  const sentence = text.slice(findStart(text, index), findEnd(text, index + needle.length)).trim()
  if (!sentence) return undefined

  return sentence.length > MAX_CONTEXT_LENGTH
    ? `${sentence.slice(0, MAX_CONTEXT_LENGTH).trimEnd()}…`
    : sentence
}

function normalize(term: string): string {
  return term.trim().toLowerCase()
}
