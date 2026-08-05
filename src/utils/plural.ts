const RULES = new Intl.PluralRules('ru-RU')

/**
 * Русское склонение по числу: `plural(21, ['слово', 'слова', 'слов'])` → «слово».
 * Без него в интерфейсе появляется «21 слов» и скобочные «сайт(ах)».
 */
export function plural(count: number, forms: [string, string, string]): string {
  const category = RULES.select(count)

  if (category === 'one') return forms[0]
  if (category === 'few') return forms[1]

  return forms[2]
}
