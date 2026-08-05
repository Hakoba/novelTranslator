import assert from 'node:assert/strict'
import { test } from 'node:test'
import initSqlJs from 'sql.js'
import { unzipSync, strFromU8 } from 'fflate'
import type { DictionaryEntry } from '@/types/words'
import { buildApkg } from './anki'
import { FIELD_NAMES, MODEL_NAME } from './ankiSchema'

const NOW = 1_700_000_000_000

const ENTRIES: DictionaryEntry[] = [
  {
    id: 'uuid-1',
    original: 'brittle',
    translate: 'хрупкий',
    context: 'The brittle bone snapped.',
    explanation: 'О материалах и характере',
    level: 'C1',
    addedAt: 1,
    updatedAt: 1,
  },
  {
    id: 'uuid-2',
    original: 'a & b <tag>',
    translate: 'проверка экранирования',
    addedAt: 2,
    updatedAt: 2,
  },
]

type AnkiModel = { name: string; flds: unknown[]; tmpls: unknown[] }

function isAnkiModel(value: unknown): value is AnkiModel {
  if (typeof value !== 'object' || value === null) return false
  const model: Record<string, unknown> = { ...value }

  return typeof model.name === 'string'
    && Array.isArray(model.flds)
    && Array.isArray(model.tmpls)
}

async function openCollection(entries: DictionaryEntry[]) {
  const apkg = await buildApkg(entries, { now: NOW })
  const files = unzipSync(apkg)

  const SQL = await initSqlJs()
  const db = new SQL.Database(files['collection.anki2'])

  return { files, db }
}

test('buildApkg: архив содержит базу коллекции и список медиа', async () => {
  const { files, db } = await openCollection(ENTRIES)

  assert.ok(files['collection.anki2'], 'нет collection.anki2')
  assert.equal(strFromU8(files['media'] ?? new Uint8Array()), '{}')
  db.close()
})

test('buildApkg: на каждое слово приходится заметка и карточка', async () => {
  const { db } = await openCollection(ENTRIES)

  const [notes] = db.exec('SELECT count(*) FROM notes')
  const [cards] = db.exec('SELECT count(*) FROM cards')

  assert.equal(notes?.values[0]?.[0], 2)
  assert.equal(cards?.values[0]?.[0], 2)
  db.close()
})

test('buildApkg: карточка ссылается на свою заметку и лежит в колоде расширения', async () => {
  const { db } = await openCollection(ENTRIES)

  const [joined] = db.exec(
    'SELECT c.nid, c.did, n.id FROM cards c JOIN notes n ON n.id = c.nid ORDER BY c.due',
  )

  assert.equal(joined?.values.length, 2)
  for (const row of joined?.values ?? []) {
    assert.equal(row[0], row[2], 'карточка ссылается на несуществующую заметку')
    assert.ok(Number(row[1]) > 1, 'карточка попала в колоду Default')
  }
  db.close()
})

test('buildApkg: поля идут в порядке схемы, html экранируется', async () => {
  const { db } = await openCollection(ENTRIES)

  const [notes] = db.exec('SELECT flds, sfld, tags FROM notes ORDER BY id')
  const first = String(notes?.values[0]?.[0]).split('\x1f')
  const second = String(notes?.values[1]?.[0]).split('\x1f')

  assert.equal(first.length, FIELD_NAMES.length)
  assert.deepEqual(first, [
    'brittle',
    'хрупкий',
    'The brittle bone snapped.',
    'О материалах и характере',
  ])
  assert.equal(notes?.values[0]?.[1], 'brittle', 'sfld должен повторять первое поле')
  assert.equal(String(notes?.values[0]?.[2]).trim(), 'C1', 'уровень уходит в теги')
  assert.equal(second[0], 'a &amp; b &lt;tag&gt;')
  db.close()
})

test('buildApkg: guid берётся из записи словаря — повторный импорт не плодит дубли', async () => {
  const { db } = await openCollection(ENTRIES)

  const [notes] = db.exec('SELECT guid FROM notes ORDER BY id')

  assert.deepEqual(notes?.values.flat(), ['uuid-1', 'uuid-2'])
  db.close()
})

test('buildApkg: контрольная сумма первого поля непустая и помещается в 32 бита', async () => {
  const { db } = await openCollection(ENTRIES)

  const [notes] = db.exec('SELECT csum FROM notes')

  for (const row of notes?.values ?? []) {
    const csum = Number(row[0])
    assert.ok(csum > 0 && csum <= 0xffffffff, `csum вне диапазона: ${csum}`)
  }
  db.close()
})

test('buildApkg: коллекция объявляет схему 11 и тип заметки с четырьмя полями', async () => {
  const { db } = await openCollection(ENTRIES)

  const [col] = db.exec('SELECT ver, models, decks FROM col')
  const [ver, modelsJson, decksJson] = col?.values[0] ?? []

  assert.equal(ver, 11)

  const models = Object.values(JSON.parse(String(modelsJson)))
  assert.equal(models.length, 1)
  const model = models[0]
  assert.ok(isAnkiModel(model), 'тип заметки не похож на модель Anki')
  assert.equal(model.name, MODEL_NAME)
  assert.equal(model.flds.length, FIELD_NAMES.length)
  assert.equal(model.tmpls.length, 1)

  const decks = JSON.parse(String(decksJson))
  assert.ok(decks['1'], 'колода Default обязательна')
  assert.equal(Object.keys(decks).length, 2)
  db.close()
})

test('buildApkg: пустой словарь даёт валидную пустую коллекцию', async () => {
  const { db } = await openCollection([])

  const [notes] = db.exec('SELECT count(*) FROM notes')
  assert.equal(notes?.values[0]?.[0], 0)
  db.close()
})
