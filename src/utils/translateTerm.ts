import type { WordWithExplanation } from '@/types/words'
import { getDictSettings } from '@/composables/useDictSettings'
import { firstTranslation } from '@/utils/dict/parse'
import { lookupTerm } from '@/utils/dictClient'
import { requestTranslation } from '@/utils/llmClient'

function isSingleWord(term: string): boolean {
  return !/\s/.test(term.trim())
}

/**
 * Одно слово переводит словарь, фразу — модель: словарь фраз не знает, а запрос
 * к модели стоит денег. Уровень CEFR приходит только от модели, поэтому у слов
 * из словаря его не будет.
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

  return requestTranslation(term, context)
}
