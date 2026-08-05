import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { DictionaryEntry } from '@/types/words'
import {
  EMPTY_FILTERS,
  collectLevels,
  normalizeTerm,
  queryEntries,
} from './dictionary'

function entry(patch: Partial<DictionaryEntry>): DictionaryEntry {
  return {
    id: patch.original ?? 'id',
    original: 'word',
    translate: 'слово',
    addedAt: 0,
    updatedAt: 0,
    ...patch,
  }
}

const ENTRIES: DictionaryEntry[] = [
  entry({ original: 'brittle', translate: 'хрупкий', level: 'C1', addedAt: 300 }),
  entry({ original: 'ancient', translate: 'древний', level: 'B1', addedAt: 100, explanation: 'о вещах и языках' }),
  entry({ original: 'cascade', translate: 'каскад', level: 'C1', addedAt: 200 }),
  entry({ original: 'deleted', translate: 'удалённое', addedAt: 400, deletedAt: 500 }),
]

test('normalizeTerm: регистр и лишние пробелы схлопываются', () => {
  assert.equal(normalizeTerm('  Flash   OF Light '), 'flash of light')
})

test('queryEntries: удалённые записи не отдаются', () => {
  const result = queryEntries(ENTRIES, EMPTY_FILTERS, 'newest')

  assert.deepEqual(result.map((item) => item.original), ['brittle', 'cascade', 'ancient'])
})

test('queryEntries: сортировка по алфавиту и по дате в обе стороны', () => {
  const names = (sort: 'newest' | 'oldest' | 'alphabetical'): string[] =>
    queryEntries(ENTRIES, EMPTY_FILTERS, sort).map((item) => item.original)

  assert.deepEqual(names('alphabetical'), ['ancient', 'brittle', 'cascade'])
  assert.deepEqual(names('oldest'), ['ancient', 'cascade', 'brittle'])
})

test('queryEntries: фильтр по уровню', () => {
  const result = queryEntries(ENTRIES, { ...EMPTY_FILTERS, level: 'C1' }, 'alphabetical')

  assert.deepEqual(result.map((item) => item.original), ['brittle', 'cascade'])
})

test('queryEntries: фильтр «только с пояснением»', () => {
  const result = queryEntries(ENTRIES, { ...EMPTY_FILTERS, onlyWithExplanation: true }, 'newest')

  assert.deepEqual(result.map((item) => item.original), ['ancient'])
})

test('queryEntries: поиск идёт и по переводу, и по пояснению', () => {
  const find = (search: string): string[] =>
    queryEntries(ENTRIES, { ...EMPTY_FILTERS, search }, 'newest').map((item) => item.original)

  assert.deepEqual(find('ANCI'), ['ancient'])
  assert.deepEqual(find('древний'), ['ancient'])
  assert.deepEqual(find('о вещах'), ['ancient'])
  assert.deepEqual(find('дракон'), [])
})

test('queryEntries: исходный массив не мутируется', () => {
  const source = [...ENTRIES]
  queryEntries(source, EMPTY_FILTERS, 'alphabetical')

  assert.deepEqual(source, ENTRIES)
})

test('collectLevels: только встречающиеся уровни, без удалённых, по порядку', () => {
  assert.deepEqual(collectLevels(ENTRIES), ['B1', 'C1'])
})
