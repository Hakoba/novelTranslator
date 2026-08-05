// Построение выражения для поиска слов в тексте. Без DOM — тестируется в node.

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Длинные первыми: иначе «light» съест начало «flash of light» */
export function normalizeTerms(terms: string[]): string[] {
  return Array.from(new Set(terms.map((term) => term.trim()).filter(Boolean)))
    .sort((a, b) => b.length - a.length)
}

/**
 * Один общий шаблон на все термины вместо регулярки на каждый: словарь может
 * вырасти до тысяч слов, а прогон по тексту тогда всего один.
 *
 * Группы ищутся тем же проходом и различаются номером скобки в совпадении —
 * так текст режется один раз. Если искать группы по очереди, второй проход
 * получит уже нарезанные куски и проверит границу слова не по тому символу.
 *
 * Границы заданы через буквы и цифры, а не `\b`: термин может начинаться
 * с апострофа или дефиса, и тогда `\b` встаёт не там, где нужно.
 */
export function buildTermsPattern(groups: string[][]): string | undefined {
  const alternatives = groups
    .filter((terms) => terms.length)
    .map((terms) => `(${terms.map(escapeRegExp).join('|')})`)

  if (!alternatives.length) return undefined

  return `(?<![\\p{L}\\d])(?:${alternatives.join('|')})(?![\\p{L}\\d])`
}

/** Номер сработавшей группы: у совпадения заполнена ровно одна скобка */
export function matchedGroupIndex(match: RegExpExecArray): number {
  for (let index = 1; index < match.length; index += 1) {
    if (match[index] !== undefined) return index - 1
  }

  return 0
}
