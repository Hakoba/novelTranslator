import { CEFR_LEVELS, type CefrLevel, type WordWithExplanation } from '@/types/words'
import { baseForms } from './forms'

/** Уровень читателя выше уровня слова — значит слово он уже знает */
export function isBelow(level: CefrLevel, readerLevel: CefrLevel): boolean {
  return CEFR_LEVELS.indexOf(level) < CEFR_LEVELS.indexOf(readerLevel)
}

/**
 * Что делать со словом из ответа модели, если офлайн-список знает его уровень.
 * Чистая часть проверки: список — страховка от завышенных уровней, поэтому
 * знакомое читателю слово выбрасываем, а пустой уровень заполняем.
 * `undefined` — слово в список не попало (фразы, имена, редкие термины).
 */
export function reviewWord(
  word: WordWithExplanation,
  known: CefrLevel | undefined,
  readerLevel: CefrLevel,
): WordWithExplanation | undefined {
  if (!known) return word
  if (isBelow(known, readerLevel)) return undefined

  // уровень модели не трогаем: она видит слово в контексте, список — нет
  return word.level ? word : { ...word, level: known }
}

let cache: Promise<Map<string, CefrLevel>> | undefined

/** 76 КБ списка грузим отдельным чанком и только когда уровень действительно спросили */
async function knownLevels(): Promise<Map<string, CefrLevel>> {
  cache ??= import('./wordLevels.data').then(({ CEFR_WORDS }) => {
    const levels = new Map<string, CefrLevel>()

    for (const level of CEFR_LEVELS) {
      for (const word of CEFR_WORDS[level].split(',')) levels.set(word, level)
    }

    return levels
  })

  return cache
}

/** Уровень слова по офлайн-списку; фразы и незнакомые слова — `undefined` */
export async function cefrLevel(term: string): Promise<CefrLevel | undefined> {
  const levels = await knownLevels()
  const exact = levels.get(term.trim().toLowerCase())
  if (exact) return exact

  // словосочетания в списке есть целиком («according to»), по словам их не разбираем
  if (/\s/.test(term.trim())) return undefined

  for (const form of baseForms(term)) {
    const level = levels.get(form)
    if (level) return level
  }

  return undefined
}

/**
 * Самый низкий уровень среди самого слова и его словарных форм. Профиль держит
 * `known` за B2 отдельно от `know` (A1), и для отбора сложных слов это шум:
 * читатель, знающий глагол, причастие прочтёт не споткнувшись. Модели этот
 * счёт не подходит — она видит слово в контексте и различает такие пары сама.
 */
export async function easiestLevel(term: string): Promise<CefrLevel | undefined> {
  const levels = await knownLevels()

  // фразы в списке лежат целиком («according to»), по словам их не разбираем
  const forms = /\s/.test(term.trim()) ? [term.trim().toLowerCase()] : baseForms(term)

  return forms
    .map((form) => levels.get(form))
    .filter((level): level is CefrLevel => Boolean(level))
    .sort((a, b) => CEFR_LEVELS.indexOf(a) - CEFR_LEVELS.indexOf(b))[0]
}

/** Отсев слов ниже уровня читателя и подстановка уровня тем, кому модель его не дала */
export async function reviewWords(
  words: WordWithExplanation[],
  readerLevel: CefrLevel,
): Promise<WordWithExplanation[]> {
  const reviewed = await Promise.all(
    words.map(async (word) => reviewWord(word, await cefrLevel(word.original), readerLevel)),
  )

  return reviewed.filter((word): word is WordWithExplanation => Boolean(word))
}
