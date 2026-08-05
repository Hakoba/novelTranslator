// Работа с текстовыми блоками. Без DOM и браузерных API — тестируется в node.

const MIN_LINE_LENGTH = 30
const MAX_CHARS = 8000

export function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, ' ').trim()
}

/**
 * Одна и та же строка приходит несколько раз: сайты дублируют абзацы в скрытых
 * блоках, а вложенные li/p дают текст родителя ещё раз. Модели это стоит токенов.
 */
export function dedupeBlocks(blocks: string[]): string[] {
  const seen = new Set<string>()

  return blocks.filter((block) => {
    if (seen.has(block)) return false
    seen.add(block)

    return true
  })
}

/** Собирает блоки в текст запроса, обрезая по лимиту символов */
export function joinBlocks(blocks: string[]): string {
  const joined = dedupeBlocks(blocks)
    .filter((block) => block.length >= MIN_LINE_LENGTH)
    .join('\n')

  return joined.length > MAX_CHARS ? joined.slice(0, MAX_CHARS) : joined
}
