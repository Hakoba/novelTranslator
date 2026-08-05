import type { CefrLevel, DictionaryEntry } from '@/types/words'

// Чистая логика словаря: без браузерных API, чтобы тестировать в node.

export type DictionarySort = 'newest' | 'oldest' | 'alphabetical'

export type DictionaryFilters = {
  search: string
  level: CefrLevel | null
  onlyWithExplanation: boolean
}

export const EMPTY_FILTERS: DictionaryFilters = {
  search: '',
  level: null,
  onlyWithExplanation: false,
}

/** Ключ дедупликации: «Flash  of Light» и «flash of light» — одно слово */
export function normalizeTerm(term: string): string {
  return term.trim().toLowerCase().replace(/\s+/g, ' ')
}

function matchesFilters(entry: DictionaryEntry, filters: DictionaryFilters): boolean {
  if (filters.level && entry.level !== filters.level) return false
  if (filters.onlyWithExplanation && !entry.explanation) return false

  const search = normalizeTerm(filters.search)
  if (!search) return true

  // ищем и по переводу с пояснением: слово вспоминается то с одной стороны, то с другой
  return [entry.original, entry.translate, entry.context, entry.explanation]
    .some((field) => typeof field === 'string' && normalizeTerm(field).includes(search))
}

const SORTERS: Record<DictionarySort, (a: DictionaryEntry, b: DictionaryEntry) => number> = {
  newest: (a, b) => b.addedAt - a.addedAt,
  oldest: (a, b) => a.addedAt - b.addedAt,
  alphabetical: (a, b) => a.original.localeCompare(b.original, 'en'),
}

/** Удалённые записи (надгробия) наружу не отдаём никогда */
export function queryEntries(
  entries: DictionaryEntry[],
  filters: DictionaryFilters,
  sort: DictionarySort,
): DictionaryEntry[] {
  return entries
    .filter((entry) => !entry.deletedAt && matchesFilters(entry, filters))
    .sort(SORTERS[sort])
}

/** Уровни, реально встречающиеся в словаре, — из них собирается фильтр */
export function collectLevels(entries: DictionaryEntry[]): CefrLevel[] {
  const levels = new Set<CefrLevel>()

  for (const entry of entries) {
    if (!entry.deletedAt && entry.level) levels.add(entry.level)
  }

  return Array.from(levels).sort()
}
