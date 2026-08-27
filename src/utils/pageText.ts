import { getAreaSelector } from '@/composables/useAreaSelectors'
import { joinBlocks, normalizeWhitespace } from './extract/blocks'
import { findRule } from './extract/rules'
import { pickBestIndex, type CandidateStats } from './extract/score'

const TEXT_TAGS = 'p, li, h1, h2, h3, h4, h5, h6, blockquote'

/** Куда обычно кладут текст сайты с семантической вёрсткой */
const CONTAINER_SELECTORS = [
  'article',
  'main',
  '[role="main"]',
  '.entry-content',
  '.post-content',
  '#content',
  '.chapter-content',
  '#chapterContent',
] as const

/** Минимум абзацев, чтобы безымянный div сошёл за контейнер главы */
const MIN_PARAGRAPHS = 3

function queryAll(selector: string): Element[] {
  try {
    return Array.from(document.querySelectorAll(selector))
  } catch {
    // селектор мог прийти из настроек и оказаться невалидным
    return []
  }
}

function isHidden(element: Element): boolean {
  if (element.getAttribute('aria-hidden') === 'true') return true
  const styles = getComputedStyle(element)

  return styles.display === 'none' || styles.visibility === 'hidden'
}

/**
 * Берём только листовые текстовые элементы: вложенный абзац отдаёт свой текст сам,
 * иначе родитель продублирует его целиком.
 */
function collectBlocks(root: Element): string[] {
  const leaves = Array.from(root.querySelectorAll(TEXT_TAGS))
    .filter((element) => !element.querySelector(TEXT_TAGS))

  // у комментариев и коротких постов абзацев внутри может не быть вовсе
  const elements = leaves.length ? leaves : [root]

  return elements
    .filter((element) => !isHidden(element))
    .map((element) => normalizeWhitespace(element.textContent ?? ''))
}

function statsOf(element: Element): CandidateStats {
  const linkTextLength = Array.from(element.querySelectorAll('a'))
    .reduce((sum, link) => sum + (link.textContent?.length ?? 0), 0)

  return {
    textLength: collectBlocks(element).join(' ').length,
    linkTextLength,
  }
}

function collectCandidates(): Element[] {
  const bySelector = CONTAINER_SELECTORS.flatMap(queryAll)
  // на сайтах без семантической вёрстки главу держит безымянный div — ищем по абзацам внутри
  const byParagraphs = Array.from(document.querySelectorAll('div, section'))
    .filter((element) => element.querySelectorAll(':scope > p').length >= MIN_PARAGRAPHS)

  return Array.from(new Set([...bySelector, ...byParagraphs]))
}

/**
 * Три источника по убыванию доверия: выбранная пользователем область →
 * правило для сайта → общий скоринг по плотности текста.
 */
async function findContentRoots(): Promise<Element[]> {
  const manualSelector = await getAreaSelector(location.href)
  const manual = manualSelector ? queryAll(manualSelector) : []
  if (manual.length) return manual

  const rule = findRule(location.host)
  const byRule = rule ? rule.selectors.flatMap(queryAll) : []
  if (byRule.length) return byRule

  const candidates = collectCandidates()
  const bestIndex = pickBestIndex(candidates.map(statsOf))
  const best = candidates[bestIndex]

  return best ? [best] : [document.body]
}

export async function extractReadableText(): Promise<string> {
  const roots = await findContentRoots()

  return joinBlocks(roots.flatMap(collectBlocks))
}
