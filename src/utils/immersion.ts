import type { DictionaryEntry } from '@/types/words'

// Режим вкраплений: сопоставление текста родной страницы со словарём
// и отбор слов для подмены. Без браузерных API — тестируется в node.

/** Словоформа из текста и запись, чьё изучаемое слово встанет на её место */
export type ImmersionMatch = {
  form: string
  entry: DictionaryEntry
}

const WORD = /\p{L}+/gu
const SENTENCE_BREAK = /[.!?\n]/g

const MIN_COMMON_PREFIX = 4
const MAX_TAIL = 3
const PAGE_LIMIT = 15

/**
 * Совпадение словоформы с переводом записи: точное либо по общей основе.
 * Морфологии нет сознательно: общий префикс ≥ 4 с хвостами ≤ 3 покрывает
 * большинство русских окончаний, лемматизация тяжелее всей фичи (deferred.md).
 */
export function matchesTranslate(form: string, translate: string): boolean {
  const a = form.toLowerCase()
  const b = translate.toLowerCase()
  if (a === b) return true

  let common = 0
  while (common < a.length && common < b.length && a[common] === b[common]) common += 1

  return common >= MIN_COMMON_PREFIX && a.length - common <= MAX_TAIL && b.length - common <= MAX_TAIL
}

/**
 * Вёдра по началу перевода вместо прогона каждого токена по всему словарю:
 * общий префикс ≥ 4 значит, что первые буквы совпадают, — ключа хватает.
 */
function buildIndex(entries: DictionaryEntry[]): Map<string, DictionaryEntry[]> {
  const index = new Map<string, DictionaryEntry[]>()

  for (const entry of entries) {
    if (entry.deletedAt) continue

    const key = entry.translate.trim().toLowerCase().slice(0, MIN_COMMON_PREFIX)
    if (!key) continue

    const bucket = index.get(key)
    if (bucket) bucket.push(entry)
    else index.set(key, [entry])
  }

  return index
}

/** Приоритет: пора повторять → ни разу не тренированные → остальные */
function rank(entry: DictionaryEntry, now: number): number {
  if (!entry.reviews) return 1

  return (entry.dueAt ?? 0) <= now ? 0 : 2
}

/** Номер предложения — сколько границ предложений левее позиции */
function sentenceIndex(breaks: number[], at: number): number {
  let low = 0
  let high = breaks.length

  while (low < high) {
    const mid = (low + high) >> 1
    if ((breaks[mid] ?? 0) < at) low = mid + 1
    else high = mid
  }

  return low
}

/**
 * Отбор вкраплений для страницы: не больше 15, по одному на предложение,
 * каждая запись — один раз. Сначала слова, которые пора повторять.
 * У записи берётся первое вхождение в текст.
 */
export function pickImmersionWords(
  text: string,
  entries: DictionaryEntry[],
  now: number,
): ImmersionMatch[] {
  const index = buildIndex(entries)
  if (!index.size) return []

  // первое вхождение каждой записи; Map держит порядок текста для равных рангов
  const found = new Map<DictionaryEntry, { form: string; at: number }>()

  for (const match of text.matchAll(WORD)) {
    const form = match[0]
    const bucket = index.get(form.toLowerCase().slice(0, MIN_COMMON_PREFIX))
    if (!bucket) continue

    for (const entry of bucket) {
      if (!found.has(entry) && matchesTranslate(form, entry.translate)) {
        found.set(entry, { form, at: match.index ?? 0 })
      }
    }
  }

  const breaks = Array.from(text.matchAll(SENTENCE_BREAK), (item) => item.index ?? 0)
  const candidates = Array.from(found, ([entry, hit]) => ({ entry, ...hit })).sort(
    (a, b) =>
      rank(a.entry, now) - rank(b.entry, now) ||
      (a.entry.dueAt ?? 0) - (b.entry.dueAt ?? 0),
  )

  const usedSentences = new Set<number>()
  // подмена в DOM идёт по первому вхождению словоформы: две записи
  // с одинаковой словоформой попали бы в одно и то же место текста
  const usedForms = new Set<string>()
  const picked: ImmersionMatch[] = []

  for (const { entry, form, at } of candidates) {
    if (picked.length >= PAGE_LIMIT) break

    const sentence = sentenceIndex(breaks, at)
    if (usedSentences.has(sentence) || usedForms.has(form.toLowerCase())) continue

    usedSentences.add(sentence)
    usedForms.add(form.toLowerCase())
    picked.push({ form, entry })
  }

  return picked
}

// Письменности языков пары. Детекция работает только когда алфавиты
// различаются: иначе английская страница прошла бы порог латиницы
// у читателя с испанским родным — и вкрапления подменили бы разбор.
const SCRIPT_BY_LANGUAGE: Record<string, string> = {
  en: 'latin',
  de: 'latin',
  fr: 'latin',
  es: 'latin',
  it: 'latin',
  pt: 'latin',
  pl: 'latin',
  tr: 'latin',
  ru: 'cyrillic',
  uk: 'cyrillic',
  ja: 'japanese',
  zh: 'han',
  ko: 'hangul',
}

const SCRIPT_LETTERS: Record<string, RegExp> = {
  latin: /\p{Script=Latin}/u,
  cyrillic: /\p{Script=Cyrillic}/u,
  japanese: /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u,
  han: /\p{Script=Han}/u,
  hangul: /\p{Script=Hangul}/u,
}

const SHARE_THRESHOLD = 0.6
/** Хвост длинной страницы долю уже не изменит */
const SAMPLE_LETTERS = 3000

/**
 * Страница на языке перевода? Доля букв его письменности среди всех букв.
 * Пары с общей письменностью не различить — режим для них молчит:
 * ложное молчание дешевле ложной замены.
 */
export function isTargetLanguageText(
  text: string,
  targetLang: string,
  sourceLang: string,
): boolean {
  const target = SCRIPT_BY_LANGUAGE[targetLang]
  if (!target || target === SCRIPT_BY_LANGUAGE[sourceLang]) return false

  const letters = SCRIPT_LETTERS[target]
  if (!letters) return false

  let total = 0
  let matched = 0

  for (const char of text) {
    if (!/\p{L}/u.test(char)) continue

    total += 1
    if (letters.test(char)) matched += 1
    if (total >= SAMPLE_LETTERS) break
  }

  return total > 0 && matched / total > SHARE_THRESHOLD
}
