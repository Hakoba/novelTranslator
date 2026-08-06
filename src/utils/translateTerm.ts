import type { WordWithExplanation } from '@/types/words'
import { getDictSettings } from '@/composables/useDictSettings'
import { firstTranslation } from '@/utils/dict/parse'
import { lookupTerm } from '@/utils/dictClient'
import { requestTranslation } from '@/utils/llmClient'
import { machineTranslate } from '@/utils/mtClient'

function isSingleWord(term: string): boolean {
  return !/\s/.test(term.trim())
}

/**
 * Три источника по возрастанию цены: словарь знает одиночные слова, машинный
 * переводчик — фразы, модель — всё остальное и с учётом контекста. Уровень CEFR
 * приходит только от модели, у первых двух его не будет.
 */
export async function translateTerm(
  term: string,
  context: string,
): Promise<WordWithExplanation | undefined> {
  const { preferDictionary } = await getDictSettings()

  if (preferDictionary && isSingleWord(term)) {
    const { results } = await lookupTerm(term)
    const translate = firstTranslation(results.find((result) => result.source === 'yandex'))

    if (translate) return { original: term, translate }
  }

  // пусто — переводчик не выбран или не справился, тогда идём к модели
  const machine = await machineTranslate(term)
  if (machine) return { original: term, translate: machine }

  return requestTranslation(term, context)
}
