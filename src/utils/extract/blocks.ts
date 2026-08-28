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
 * Что на странице появилось нового. Читалки догружают продолжение хвостом
 * к прежнему тексту: он растёт, начало остаётся тем же. Разбирать всё заново — это
 * и лишние запросы, и обрезка по лимиту, из-за которой дописанное в запрос уже
 * не влезет. Совпал префикс — берём только новое; не совпал (страницу заменили
 * или в середину вклинилась вставка) — разбираем целиком, как раньше.
 */
export function appendedTail(previous: string, current: string): string {
  return previous && current.startsWith(previous) ? current.slice(previous.length) : current
}

/** Обрезка перед отправкой: берём начало разбираемого куска, а у догруженного текста это его начало */
export function limitChars(text: string): string {
  return text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text
}

/**
 * Что отправить в разбор. Пустая строка — отправлять нечего.
 *
 * Обычный проход берёт дописанное. Когда его нет, решает исход прошлого раза:
 * разбор упал — повторяем тот же кусок (иначе кнопка «Повторить» на странице,
 * которая больше не растёт, не делала бы ничего), прошёл — новых слов взяться
 * неоткуда.
 */
export function textToAnalyze(input: {
  /** Читать страницу целиком: ручной перезапуск и смена области */
  full: boolean
  pageText: string
  /** Текст, разобранный на этой странице раньше */
  analyzedText: string
  /** Кусок, ушедший в разбор последним */
  lastChunk: string
  hasError: boolean
}): string {
  if (input.full) return limitChars(input.pageText)

  const appended = appendedTail(input.analyzedText, input.pageText)
  if (appended) return limitChars(appended)

  return input.hasError ? input.lastChunk : ''
}
