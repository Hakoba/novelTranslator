import type { WordWithExplanation } from '@/types/words'
import { getDictSettings } from '@/composables/useDictSettings'
import { getReaderSettings } from '@/composables/useReaderSettings'
import { cefrLevel } from '@/utils/cefr/levels'
import { firstTranslation } from '@/utils/dict/parse'
import { lookupTerm } from '@/utils/dictClient'
import { requestTranslation } from '@/utils/llmClient'
import { machineTranslate } from '@/utils/mtClient'

function isSingleWord(term: string): boolean {
  return !/\s/.test(term.trim())
}

/** Модель уровень ставит сама, словарю и переводчику его подсказывает офлайн-список */
async function withLevel(
  word: WordWithExplanation,
  sourceLang: string,
): Promise<WordWithExplanation> {
  if (sourceLang !== 'en') return word

  const level = await cefrLevel(word.original)

  return level ? { ...word, level } : word
}

/**
 * Дешёвые источники: словарь знает одиночные слова, машинный переводчик — фразы.
 * Модели тут нет намеренно — в режиме «только словари» звать её нельзя.
 */
export async function dictTranslate(term: string): Promise<WordWithExplanation | undefined> {
  const { preferDictionary } = await getDictSettings()
  const { sourceLang } = await getReaderSettings()

  if (preferDictionary && isSingleWord(term)) {
    const { results } = await lookupTerm(term)
    const translate = firstTranslation(results.find((result) => result.source === 'yandex'))

    if (translate) return withLevel({ original: term, translate }, sourceLang)
  }

  const machine = await machineTranslate(term)

  return machine ? withLevel({ original: term, translate: machine }, sourceLang) : undefined
}

/**
 * Три источника по возрастанию цены: словарь знает одиночные слова, машинный
 * переводчик — фразы, модель — всё остальное и с учётом контекста. Уровень CEFR
 * ставит модель, а для первых двух его достаёт офлайн-список — без уровня запись
 * выпадает из фильтров на экране словаря.
 */
export async function translateTerm(
  term: string,
  context: string,
): Promise<WordWithExplanation | undefined> {
  // пусто — словарь не знает слова, а переводчик не выбран или не справился
  return (await dictTranslate(term)) ?? requestTranslation(term, context)
}
