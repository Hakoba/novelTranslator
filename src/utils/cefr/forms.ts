/**
 * Словарные формы слова из текста: в главе стоит `walked` и `boxes`, а в списке
 * CEFR — `walk` и `box`. Полноценная лемматизация тут не нужна и стоила бы
 * отдельной библиотеки; неправильные глаголы список всё равно не покрывает.
 * Без браузерных API — тестируется в node.
 */

const SUFFIX_RULES: { suffix: string; endings: string[] }[] = [
  { suffix: 'ies', endings: ['y'] },
  { suffix: 'es', endings: ['', 'e'] },
  { suffix: 's', endings: [''] },
  { suffix: 'ied', endings: ['y'] },
  { suffix: 'ed', endings: ['', 'e'] },
  { suffix: 'ing', endings: ['', 'e'] },
  { suffix: 'est', endings: ['', 'e'] },
  { suffix: 'er', endings: ['', 'e'] },
  { suffix: 'ly', endings: ['', 'e'] },
]

/** `stopped` → `stopp` → `stop`: перед -ed и -ing согласная удваивается */
function undouble(stem: string): string | undefined {
  const last = stem.at(-1)

  return last && last === stem.at(-2) && !'aeiou'.includes(last) ? stem.slice(0, -1) : undefined
}

/**
 * Кандидаты в порядке убывания доверия: сначала само слово, потом снятые
 * окончания. Ищущий берёт первое, что нашлось в списке.
 */
export function baseForms(word: string): string[] {
  const normalized = word.trim().toLowerCase()
  if (!normalized) return []

  const forms = [normalized]

  for (const { suffix, endings } of SUFFIX_RULES) {
    if (!normalized.endsWith(suffix) || normalized.length <= suffix.length + 1) continue

    const stem = normalized.slice(0, -suffix.length)

    for (const ending of endings) forms.push(stem + ending)

    const single = undouble(stem)
    if (single) forms.push(single)
  }

  return [...new Set(forms)]
}
