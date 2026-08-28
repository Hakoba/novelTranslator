// Разбор CHANGELOG.md: файл целиком приезжает в сборку через __CHANGELOG__, а экрану
// после обновления нужен свежий раздел. Без браузерных API — тест в node.

export type ChangelogKind = 'added' | 'changed' | 'fixed'

export interface ChangelogItem {
  title: string
  details: string
}

export interface ChangelogGroup {
  kind: ChangelogKind | undefined
  title: string
  items: ChangelogItem[]
}

export interface ChangelogSection {
  title: string
  groups: ChangelogGroup[]
}

// Заголовки в файле русские — CHANGELOG разработческий, а интерфейс переводится
const KINDS: Record<string, ChangelogKind> = {
  Добавлено: 'added',
  Изменено: 'changed',
  Исправлено: 'fixed',
}

// Сначала новое, починки последними: читателю интересны возможности, а не список багов
const KIND_ORDER: ChangelogKind[] = ['added', 'changed', 'fixed']

// Дальше этого заголовок пункта уже не заголовок, а абзац
const TITLE_LIMIT = 110

const PAIRS: Record<string, string> = { '(': ')', '«': '»' }

/** Разметка, которую в интерфейсе рисовать нечем: код в обратных кавычках и ссылки */
function stripMarkup(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/`/g, '')
}

/**
 * Пункт написан как «суть: подробности», «суть — подробности» или «суть. Подробности»:
 * в свёрнутом виде
 * показываем суть, остальное открывается по клику. Разделитель внутри скобок и кавычек
 * не в счёт — «Подсказки (CSS-тултип: …)» иначе рвётся по открытой скобке.
 */
export function splitItem(text: string): ChangelogItem {
  const closing: string[] = []

  for (let i = 0; i < text.length && i <= TITLE_LIMIT; i += 1) {
    const char = text[i]

    if (PAIRS[char]) closing.push(PAIRS[char])
    else if (char === closing[closing.length - 1]) closing.pop()
    else if (closing.length === 0) {
      if (char === ':' && text[i + 1] === ' ') {
        return { title: text.slice(0, i), details: text.slice(i + 2) }
      }
      if (char === '.' && text[i + 1] === ' ') {
        return { title: text.slice(0, i), details: text.slice(i + 2) }
      }
      if (char === '—' && text[i - 1] === ' ' && text[i + 1] === ' ') {
        return { title: text.slice(0, i - 1), details: text.slice(i + 2) }
      }
    }
  }

  if (text.length <= TITLE_LIMIT) return { title: text, details: '' }

  // разделителя нет вовсе — режем по слову, и пункт уходит под раскрытие целиком
  return { title: `${text.slice(0, text.lastIndexOf(' ', TITLE_LIMIT))}…`, details: text }
}

/** Тело одного раздела: строка заголовка, ниже группы `### …` со списками */
function parseSection(body: string): ChangelogSection | undefined {
  const [head, ...lines] = body.split('\n')
  const groups: ChangelogGroup[] = []
  let group: ChangelogGroup | undefined
  let item = ''

  const flush = (): void => {
    if (group && item) group.items.push(splitItem(stripMarkup(item)))
    item = ''
  }

  for (const line of lines) {
    if (line.startsWith('### ')) {
      flush()
      const title = line.slice(4).trim()
      group = { kind: KINDS[title], title, items: [] }
      groups.push(group)
    } else if (line.startsWith('- ')) {
      flush()
      item = line.slice(2).trim()
    } else if (line.trim() && item) {
      // пункт перенесён по строкам с отступом продолжения — склеиваем обратно
      item += ` ${line.trim()}`
    } else {
      flush()
    }
  }
  flush()

  const filled = groups.filter((entry) => entry.items.length)
  filled.sort((a, b) => kindWeight(a.kind) - kindWeight(b.kind))

  return filled.length ? { title: head.trim(), groups: filled } : undefined
}

function kindWeight(kind: ChangelogKind | undefined): number {
  const index = kind ? KIND_ORDER.indexOf(kind) : -1

  return index === -1 ? KIND_ORDER.length : index
}

/**
 * Свежий раздел — верхний, в котором есть пункты: после релиза наверху остаётся
 * пустое «Не выпущено», и показывать надо не его.
 */
export function parseTopSection(markdown: string): ChangelogSection | undefined {
  for (const body of markdown.split(/^## /m).slice(1)) {
    const section = parseSection(body)
    if (section) return section
  }

  return undefined
}
