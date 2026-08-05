import assert from 'node:assert/strict'
import { test } from 'node:test'
import { plural } from './plural'

const WORDS: [string, string, string] = ['слово', 'слова', 'слов']

test('plural: три формы по правилам русского', () => {
  assert.equal(plural(1, WORDS), 'слово')
  assert.equal(plural(2, WORDS), 'слова')
  assert.equal(plural(5, WORDS), 'слов')
  // ловушки: 11–14 идут по «слов», а 21 и 22 возвращаются к первым формам
  assert.equal(plural(11, WORDS), 'слов')
  assert.equal(plural(21, WORDS), 'слово')
  assert.equal(plural(22, WORDS), 'слова')
  assert.equal(plural(0, WORDS), 'слов')
})
