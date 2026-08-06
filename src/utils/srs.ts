import type { DictionaryEntry } from '@/types/words'

// Планировщик повторений. Без браузерных API — тестируется в node.

/** Лестница интервалов в днях: угадал — шаг вверх, ошибся — в начало */
const INTERVALS_DAYS = [1, 3, 7, 16, 35, 90] as const

const DAY_MS = 24 * 60 * 60 * 1000

export type ReviewProgress = Pick<
  DictionaryEntry,
  'dueAt' | 'intervalStep' | 'reviews' | 'lapses'
>

/** Сколько дней ждать после успешного ответа на этом шаге */
export function intervalDays(step: number): number {
  const index = Math.min(Math.max(step, 0), INTERVALS_DAYS.length - 1)

  return INTERVALS_DAYS[index] ?? 1
}

/**
 * Ошибка сбрасывает лестницу целиком, а не отступает на шаг: слово, которое
 * забылось после месяца, знаешь не лучше нового.
 */
export function reviewEntry(
  entry: DictionaryEntry,
  isKnown: boolean,
  now: number,
): ReviewProgress {
  const step = isKnown ? (entry.intervalStep ?? -1) + 1 : 0
  const days = isKnown ? intervalDays(step) : 1

  return {
    dueAt: now + days * DAY_MS,
    intervalStep: step,
    reviews: (entry.reviews ?? 0) + 1,
    lapses: (entry.lapses ?? 0) + (isKnown ? 0 : 1),
  }
}

/** Слова, которые пора повторить: ни разу не тренированные идут первыми */
export function dueEntries(entries: DictionaryEntry[], now: number): DictionaryEntry[] {
  return entries
    .filter((entry) => !entry.deletedAt && (entry.dueAt ?? 0) <= now)
    .sort((a, b) => (a.dueAt ?? 0) - (b.dueAt ?? 0))
}

export function countNew(entries: DictionaryEntry[]): number {
  return entries.filter((entry) => !entry.deletedAt && !entry.reviews).length
}

/**
 * Через сколько дней слово всплывёт в тренировке: 0 — уже пора или ещё ни разу
 * не тренировали. Округление вверх, чтобы «через 20 часов» читалось как «завтра».
 */
export function dueInDays(dueAt: number | undefined, now: number): number {
  if (!dueAt || dueAt <= now) return 0

  return Math.ceil((dueAt - now) / DAY_MS)
}

/** Ближайшая дата повторения среди тех слов, что ещё не подошли */
export function nextDueAt(entries: DictionaryEntry[], now: number): number | undefined {
  const upcoming = entries
    .filter((entry) => !entry.deletedAt && (entry.dueAt ?? 0) > now)
    .map((entry) => entry.dueAt ?? 0)

  return upcoming.length ? Math.min(...upcoming) : undefined
}
