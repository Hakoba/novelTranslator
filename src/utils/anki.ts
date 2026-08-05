import initSqlJs, { type Database } from 'sql.js'
import { strToU8, zipSync } from 'fflate'
import type { DictionaryEntry } from '@/types/words'
import {
  CREATE_TABLES,
  DEFAULT_CONF,
  DEFAULT_DECK_CONF,
  buildDeck,
  buildModel,
} from './ankiSchema'

/**
 * Сборка колоды `.apkg` — это zip с базой SQLite внутри (схема 11, её понимают
 * все версии Anki 2.1+). Формат текстового импорта проще, но требует руками
 * размечать поля при каждом импорте.
 */

/** Постоянные id: при повторном экспорте Anki попадает в ту же колоду и тот же тип заметки */
const DECK_ID = 1_600_000_000_000
const MODEL_ID = 1_600_000_000_001

/** Разделитель полей заметки в Anki */
const FIELD_SEPARATOR = '\x1f'

export type ApkgOptions = {
  /** Где искать sql-wasm.wasm; в node он находится сам, в браузере путь даёт сборщик */
  locateFile?: (file: string) => string
  now?: number
}

function escapeHtml(input: string): string {
  return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Anki хранит контрольную сумму первого поля — по ней ищет дубликаты */
async function fieldChecksum(text: string): Promise<number> {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text))
  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

  return parseInt(hex.slice(0, 8), 16)
}

/** Полночь по локальному времени: от неё Anki отсчитывает дни */
function collectionCreatedAt(now: number): number {
  const date = new Date(now)
  date.setHours(0, 0, 0, 0)

  return Math.floor(date.getTime() / 1000)
}

/** Заметка хранит данные, карточка — расписание показа; на слово нужно и то, и другое */
async function insertEntry(
  db: Database,
  entry: DictionaryEntry,
  index: number,
  now: number,
  nowSec: number,
): Promise<void> {
  const fields = [
    entry.original,
    entry.translate,
    entry.context ?? '',
    entry.explanation ?? '',
  ].map(escapeHtml)

  const firstField = fields[0] ?? ''
  // id заметки и карточки — миллисекунды; смещение по индексу держит их уникальными
  const noteId = now + index * 2
  const cardId = noteId + 1

  db.run('INSERT INTO notes VALUES (?,?,?,?,?,?,?,?,?,?,?)', [
    noteId,
    // guid = id записи словаря: повторный экспорт обновит заметку, а не создаст дубль
    entry.id,
    MODEL_ID,
    nowSec,
    -1,
    entry.level ? ` ${entry.level} ` : '',
    fields.join(FIELD_SEPARATOR),
    firstField,
    await fieldChecksum(firstField),
    0,
    '',
  ])

  db.run('INSERT INTO cards VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [
    cardId,
    noteId,
    DECK_ID,
    0,
    nowSec,
    -1,
    0,
    0,
    // порядок показа новых карточек
    index + 1,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    '',
  ])
}

export async function buildApkg(
  entries: DictionaryEntry[],
  options: ApkgOptions = {},
): Promise<Uint8Array> {
  const now = options.now ?? Date.now()
  const nowSec = Math.floor(now / 1000)

  const SQL = await initSqlJs(options.locateFile ? { locateFile: options.locateFile } : {})
  const db = new SQL.Database()

  try {
    db.run(CREATE_TABLES)

    db.run('INSERT INTO col VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', [
      1,
      collectionCreatedAt(now),
      nowSec,
      now,
      11,
      0,
      0,
      0,
      JSON.stringify(DEFAULT_CONF),
      JSON.stringify({ [MODEL_ID]: buildModel(MODEL_ID, DECK_ID, nowSec) }),
      JSON.stringify({
        1: buildDeck(1, nowSec, 'Default'),
        [DECK_ID]: buildDeck(DECK_ID, nowSec),
      }),
      JSON.stringify(DEFAULT_DECK_CONF),
      '{}',
    ])

    for (const [index, entry] of entries.entries()) {
      await insertEntry(db, entry, index, now, nowSec)
    }

    return zipSync({
      'collection.anki2': db.export(),
      // список медиафайлов; у нас их нет, но без файла Anki импорт не примет
      media: strToU8('{}'),
    })
  } finally {
    db.close()
  }
}
