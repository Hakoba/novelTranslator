const RULES = new Intl.PluralRules('ru-RU')

/**
 * Номер русской формы для числа: 21 → 0 («слово»), 22 → 1 («слова»), 11 → 2 («слов»).
 * Отдаётся vue-i18n через `pluralRules` — его собственные правила знают только
 * две формы и дают «21 слов».
 */
export function pluralIndex(count: number): number {
  const category = RULES.select(count)

  if (category === 'one') return 0
  if (category === 'few') return 1

  return 2
}
