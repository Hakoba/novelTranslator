import assert from 'node:assert/strict'
import { test } from 'node:test'
import { pickHardest, textWords, type LeveledWord } from './hardWords'

test('textWords: повторы схлопываются, регистр не важен', () => {
  assert.deepEqual(textWords('The fog, the FOG and a lamp.'), ['the', 'fog', 'and', 'a', 'lamp'])
})

test('textWords: апостроф остаётся внутри слова, дефис разделяет', () => {
  assert.deepEqual(textWords("don't well-known"), ['don\'t', 'well', 'known'])
})

test('textWords: цифры и знаки препинания в слова не попадают', () => {
  assert.deepEqual(textWords('Chapter 12 — “mist”'), ['chapter', 'mist'])
})

const words: LeveledWord[] = [
  { original: 'lamp', level: 'A2' },
  { original: 'fog', level: 'B2' },
  { original: 'dusk', level: 'C1' },
  { original: 'mist', level: 'B2' },
]

test('pickHardest: слова ниже уровня читателя выбрасываются', () => {
  assert.deepEqual(pickHardest(words, 'B1', 10).map((word) => word.original), ['dusk', 'fog', 'mist'])
})

test('pickHardest: сначала самые сложные, внутри уровня — порядок текста', () => {
  assert.deepEqual(pickHardest(words, 'A1', 10).map((word) => word.original), ['dusk', 'fog', 'mist', 'lamp'])
})

test('pickHardest: лимит режет по верхушке, а не по началу текста', () => {
  assert.deepEqual(pickHardest(words, 'A1', 2).map((word) => word.original), ['dusk', 'fog'])
})

test('pickHardest: слово ровно на уровне читателя остаётся', () => {
  assert.deepEqual(pickHardest(words, 'C1', 10).map((word) => word.original), ['dusk'])
})
