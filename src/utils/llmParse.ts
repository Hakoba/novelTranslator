import { CEFR_LEVELS, type CefrLevel, type WordWithExplanation } from '@/types/words'

// Разбор ответов LLM. Без зависимостей от браузерных API — чтобы можно было тестировать в node.

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null
}

/** Достаёт текст ответа из ответа chat/completions */
export function extractContent(data: unknown): string {
  if (!isObject(data)) return ''
  const choices = Array.isArray(data.choices) ? data.choices : []
  const first = choices[0]
  return isObject(first) && isObject(first.message) && typeof first.message.content === 'string'
    ? first.message.content
    : ''
}

/** Уровень модель пишет как придётся: «b2», « B2 », «B2 (upper-intermediate)» — берём только точное совпадение */
function parseLevel(value: unknown): CefrLevel | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim().toUpperCase()

  return CEFR_LEVELS.find((level) => level === normalized)
}

/**
 * Модели регулярно нарушают контракт «только JSON»: заворачивают ответ в ```json
 * и дописывают рассуждения до и после. Берём первый массив из текста.
 */
export function parseWords(content: string): WordWithExplanation[] {
  const start = content.indexOf('[')
  const end = content.lastIndexOf(']')
  if (start === -1 || end <= start) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(content.slice(start, end + 1))
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  return parsed
    .filter(isObject)
    .map((o): WordWithExplanation | undefined => {
      const original = typeof o['original'] === 'string' ? o['original'] : ''
      const translate = typeof o['translate'] === 'string' ? o['translate'] : ''
      if (!original || !translate) return undefined

      const level = parseLevel(o['level'])
      return level ? { original, translate, level } : { original, translate }
    })
    .filter((v): v is WordWithExplanation => typeof v !== 'undefined')
}
