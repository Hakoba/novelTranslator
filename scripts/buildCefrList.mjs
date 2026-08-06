/**
 * Собирает офлайн-список уровней CEFR из открытых профилей в компактный модуль.
 *
 * Источники (скачиваются на лету, в репозиторий кладётся только результат):
 * - CEFR-J Vocabulary Profile 1.5 (A1–B2), Tono Laboratory, Tokyo University of
 *   Foreign Studies — research and commercial use with attribution;
 * - Octanove Vocabulary Profile C1/C2 1.0, Octanove Labs — CC BY-SA 4.0.
 *
 * Запуск: node scripts/buildCefrList.mjs [путь-к-cefrj.csv путь-к-octanove.csv]
 * Без аргументов файлы скачиваются, с аргументами читаются с диска.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { argv } from 'node:process'

const SOURCES = [
  'https://raw.githubusercontent.com/openlanguageprofiles/olp-en-cefrj/master/cefrj-vocabulary-profile-1.5.csv',
  'https://raw.githubusercontent.com/openlanguageprofiles/olp-en-cefrj/master/octanove-vocabulary-profile-c1c2-1.0.csv',
]
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const OUT = new URL('../src/utils/cefr/wordLevels.data.ts', import.meta.url)

/** Первая колонка CSV; кавычки нас не касаются — заголовки слов их не содержат */
function headword(line) {
  return line.split(',')[0]
}

function level(line) {
  return line.split(',')[2]
}

async function readSource(source) {
  if (!source.startsWith('http')) return (await readFile(source, 'utf8')).split('\n').slice(1)

  const res = await fetch(source)
  if (!res.ok) throw new Error(`${source} → HTTP ${res.status}`)

  return (await res.text()).split('\n').slice(1)
}

const sources = argv.length > 2 ? argv.slice(2) : SOURCES
const known = new Map()

for (const url of sources) {
  for (const line of await readSource(url)) {
    const cefr = level(line)
    if (!LEVELS.includes(cefr)) continue

    // «a.m./A.M./am/AM» — один заголовок на несколько написаний
    for (const variant of headword(line).split('/')) {
      const word = variant.trim().toLowerCase()
      // фразы вроде «according to» оставляем: разбор возвращает и словосочетания
      if (!word || !/^[a-z][a-z' -]*$/.test(word)) continue

      const current = known.get(word)
      // слово с несколькими частями речи берём по самому раннему уровню:
      // если читатель знает его как A1, подсказывать его на B2 незачем
      if (!current || LEVELS.indexOf(cefr) < LEVELS.indexOf(current)) known.set(word, cefr)
    }
  }
}

// по уровням одной строкой: 10 000 слов в JSON-объекте — это 10 000 пар кавычек
const byLevel = Object.fromEntries(
  LEVELS.map((cefr) => [
    cefr,
    [...known].filter(([, value]) => value === cefr).map(([word]) => word).sort().join(','),
  ]),
)

const header = `/**
 * Уровни CEFR для ${known.size} английских слов и словосочетаний. Файл собран
 * скриптом \`scripts/buildCefrList.mjs\`, руками не правится.
 *
 * Источники:
 * - CEFR-J Vocabulary Profile 1.5 (A1–B2) © Yukio Tono, Tokyo University of Foreign
 *   Studies — свободно для исследовательского и коммерческого использования при
 *   указании авторства, http://www.cefr-j.org/download.html
 * - Octanove Vocabulary Profile C1/C2 1.0 © Octanove Labs — CC BY-SA 4.0,
 *   https://github.com/openlanguageprofiles/olp-en-cefrj
 *
 * Слова хранятся строками через запятую: объект из ${known.size} ключей стоил бы
 * вдвое дороже на одних кавычках.
 */
`

await writeFile(
  OUT,
  `${header}export const CEFR_WORDS: Record<string, string> = ${JSON.stringify(byLevel, null, 2)}\n`,
)

console.info(`${known.size} слов → ${OUT.pathname}`)
