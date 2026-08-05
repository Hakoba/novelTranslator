// Выбор контейнера с текстом на незнакомом сайте. Без DOM — тестируется в node.

export type CandidateStats = {
  /** Длина текста в листовых текстовых блоках контейнера */
  textLength: number
  /** Сколько из этой длины приходится на ссылки */
  linkTextLength: number
}

/** Меньше — это уже не глава, а подпись или хлебные крошки */
const MIN_TEXT_LENGTH = 200
/** Выше — это меню, лента ссылок или блок «читайте также», а не текст */
const MAX_LINK_DENSITY = 0.5

/**
 * Плотность ссылок отделяет текст от навигации: в главе ссылок почти нет,
 * в сайдбаре и футере текст состоит из них целиком.
 */
export function scoreCandidate({ textLength, linkTextLength }: CandidateStats): number {
  if (textLength < MIN_TEXT_LENGTH) return 0

  const linkDensity = Math.min(linkTextLength / textLength, 1)
  if (linkDensity > MAX_LINK_DENSITY) return 0

  return Math.round(textLength * (1 - linkDensity))
}

/** Индекс лучшего кандидата или -1, если ни один не похож на текст */
export function pickBestIndex(candidates: CandidateStats[]): number {
  let bestIndex = -1
  let bestScore = 0

  candidates.forEach((candidate, index) => {
    const score = scoreCandidate(candidate)
    if (score > bestScore) {
      bestScore = score
      bestIndex = index
    }
  })

  return bestIndex
}
