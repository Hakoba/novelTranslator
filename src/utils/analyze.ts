import type { CefrLevel, WordWithExplanation } from '@/types/words'
import { getReaderSettings } from '@/composables/useReaderSettings'
import { findHardWords } from '@/utils/cefr/hardWords'
import { requestDifficultWords } from '@/utils/llmClient'
import { unwrapSettled } from '@/utils/settled'
import { dictTranslate } from '@/utils/translateTerm'
import { t } from '@/utils/i18n'

export interface AnalyzeOutcome {
  words: WordWithExplanation[]
  /** Источник переводов отказал целиком: слова показываем, причину — рядом со списком */
  error?: string
}

/** Профиль CEFR собран только по английскому: остальным языкам нужна модель */
export const PROFILE_LANG = 'en'

/**
 * Разбор без модели: слова отбирает офлайн-профиль CEFR, перевод к каждому даёт
 * словарь. Запросов ровно столько, сколько строк увидит читатель, — список уже
 * обрезан по лимиту. Слово, которого словарь не знает, остаётся без перевода:
 * уровень и подсветка от этого не пропадают.
 */
async function findByProfile(text: string, level: CefrLevel): Promise<AnalyzeOutcome> {
  const found = await findHardWords(text, level)

  const settled = await Promise.allSettled(found.map(async (word): Promise<WordWithExplanation> => {
    const translated = await dictTranslate(word.original)

    return translated ? { ...word, translate: translated.translate } : word
  }))

  const { values, error } = unwrapSettled(settled, found)

  return { words: values, error }
}

/**
 * Кто ищет сложные слова на странице. Модель видит контекст и берёт фразы целиком,
 * но требует ключа и денег; профиль работает сразу после установки и знает только
 * отдельные английские слова.
 */
export async function analyzeText(text: string): Promise<AnalyzeOutcome> {
  const { engine, level, sourceLang } = await getReaderSettings()

  // модель отвечает списком целиком: у неё либо есть ответ, либо ошибка запроса
  if (engine === 'llm') return { words: await requestDifficultWords(text) }

  // молча вернуть пустой список нельзя: читатель решит, что сложных слов нет
  if (sourceLang !== PROFILE_LANG) throw new Error(t('errors.profileOnlyEnglish'))

  return findByProfile(text, level)
}
