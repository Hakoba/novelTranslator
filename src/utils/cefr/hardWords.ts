/**
 * Поиск сложных слов без модели: уровень каждого слова берётся из офлайн-профиля
 * CEFR, порог — уровень читателя. Разбор текста и отбор — чистые функции, они
 * тестируются в node; за уровнем ходит `cefrLevel`, ему нужен ленивый импорт списка.
 */

import { CEFR_LEVELS, type CefrLevel, type WordWithExplanation } from '@/types/words'
import { easiestLevel, isBelow } from './levels'

/**
 * Сколько слов показываем за раз. В главе слов выше уровня набирается под сотню,
 * прочитать за раз можно десяток, а каждое слово потом стоит запроса в словарь.
 */
export const HARD_WORDS_LIMIT = 25

/** Слова текста без повторов, в порядке появления. Апостроф внутри слова свой: `don't` — одно слово */
export function textWords(text: string): string[] {
  const found = text.toLowerCase().match(/\p{L}+(?:['’]\p{L}+)*/gu) ?? []

  return [...new Set(found)]
}

export type LeveledWord = { original: string; level: CefrLevel }

/**
 * Что показать читателю: слова ниже его уровня он и так знает, а из оставшихся
 * берём самые сложные. Сортировка стабильная, поэтому внутри уровня порядок
 * остаётся тем, в котором слова идут по тексту.
 */
export function pickHardest(
  candidates: LeveledWord[],
  readerLevel: CefrLevel,
  limit: number,
): LeveledWord[] {
  return candidates
    .filter(({ level }) => !isBelow(level, readerLevel))
    .sort((a, b) => CEFR_LEVELS.indexOf(b.level) - CEFR_LEVELS.indexOf(a.level))
    .slice(0, limit)
}

/**
 * Слова текста выше уровня читателя. Чего в профиле нет — имена, термины,
 * опечатки — пропускаем: без уровня их не с чем сравнить, а имена персонажей
 * иначе заполнили бы весь список.
 */
export async function findHardWords(
  text: string,
  readerLevel: CefrLevel,
  limit: number = HARD_WORDS_LIMIT,
): Promise<WordWithExplanation[]> {
  const leveled = await Promise.all(
    textWords(text).map(async (original): Promise<LeveledWord | undefined> => {
      const level = await easiestLevel(original)

      return level ? { original, level } : undefined
    }),
  )

  const known = leveled.filter((word): word is LeveledWord => Boolean(word))

  // перевода тут ещё нет: за ним идут отдельно и только для отобранных слов
  return pickHardest(known, readerLevel, limit).map(({ original, level }) => ({
    original,
    translate: '',
    level,
  }))
}
