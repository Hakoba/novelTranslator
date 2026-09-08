import type { WordWithExplanation } from '@/types/words'
import { getDictSettings } from '@/composables/useDictSettings'
import { getReaderSettings } from '@/composables/useReaderSettings'
import { cefrLevel } from '@/utils/cefr/levels'
import { firstTranslation } from '@/utils/dict/parse'
import { lookupTranslation } from '@/utils/dictClient'
import { requestTranslation } from '@/utils/llmClient'
import { machineTranslate, machineTranslateMany } from '@/utils/mtClient'
import { getTranslator } from '@/utils/mt/translators'
import { unwrapSettled, type SettledOutcome } from '@/utils/settled'

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
 * Дешёвый источник — тот, что выбран в настройках: Яндекс.Словарь или машинный
 * переводчик. Модели тут нет намеренно: в режиме «только словари» звать её нельзя,
 * а «не переводить» так и оставляет слово без перевода.
 */
export async function dictTranslate(term: string): Promise<WordWithExplanation | undefined> {
  const { translator } = await getDictSettings()
  const { sourceLang } = await getReaderSettings()

  // Яндекс.Словарь знает только одиночные слова: фразу он не переведёт, и она уходит к модели
  if (translator === 'yandex') {
    if (!isSingleWord(term)) return undefined

    const { results } = await lookupTranslation(term)
    const translate = firstTranslation(results.find((result) => result.source === 'yandex'))

    return translate ? withLevel({ original: term, translate }, sourceLang) : undefined
  }

  const machine = await machineTranslate(term)

  return machine ? withLevel({ original: term, translate: machine }, sourceLang) : undefined
}

/**
 * Переводы к пачке слов разбора. Машинный переводчик получает их одним запросом
 * (или по слову, если пакет не умеет), Яндекс.Словарь — только по слову. Позиции
 * совпадают с `terms`; `undefined` — перевода нет. Отказ источника целиком —
 * в `error`, как у `unwrapSettled`.
 */
export async function dictTranslateMany(terms: string[]): Promise<SettledOutcome<string | undefined>> {
  const { translator } = await getDictSettings()

  // по слову — как раньше: отказ одного запроса не должен стирать остальные переводы
  if (!getTranslator(translator)?.batch) {
    const settled = await Promise.allSettled(terms.map(async (term) => (await dictTranslate(term))?.translate))

    return unwrapSettled(settled, terms.map(() => undefined))
  }

  try {
    const values = await machineTranslateMany(terms)

    return { values: values.map((text) => text || undefined) }
  } catch (error) {
    return { values: terms.map(() => undefined), error: error instanceof Error ? error.message : String(error) }
  }
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
