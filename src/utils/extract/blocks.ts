// Работа с текстовыми блоками. Без DOM и браузерных API — тестируется в node.

const MIN_LINE_LENGTH = 30

/** Потолок запроса: у облачной модели каждый лишний символ платный */
export const MAX_CHARS = 8000

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

/**
 * Собирает блоки в текст страницы целиком, без обрезки: по нему потом ищется
 * дописанное, а обрезанный хвост для этого не годится — текст растёт с конца.
 */
export function joinBlocks(blocks: string[]): string {
  return dedupeBlocks(blocks)
    .filter((block) => block.length >= MIN_LINE_LENGTH)
    .join('\n')
}

/**
 * Что на странице появилось нового. Читалки догружают следующую главу хвостом
 * к прежней: текст растёт, начало остаётся тем же. Разбирать всё заново — это
 * и лишние запросы, и обрезка по лимиту, из-за которой дописанное в запрос уже
 * не влезет. Совпал префикс — берём только новое; не совпал (страницу заменили,
 * или между главами вклинилась вставка) — разбираем целиком, как раньше.
 */
export function appendedTail(previous: string, current: string): string {
  return previous && current.startsWith(previous) ? current.slice(previous.length) : current
}

/** Обрезка перед отправкой: берём начало разбираемого куска, а у догруженной главы это её начало */
export function limitChars(text: string): string {
  return text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text
}
