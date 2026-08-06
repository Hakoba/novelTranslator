import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cefrLevel, easiestLevel, isBelow, reviewWord } from './levels'

const word = { original: 'magic', translate: 'магия' }

test('reviewWord: знакомое читателю слово выбрасывается', () => {
  assert.equal(reviewWord({ ...word, level: 'B2' }, 'A2', 'B1'), undefined)
})

test('reviewWord: слово на уровне читателя и выше остаётся', () => {
  assert.deepEqual(reviewWord(word, 'B1', 'B1'), { ...word, level: 'B1' })
  assert.deepEqual(reviewWord(word, 'C1', 'B1'), { ...word, level: 'C1' })
})

test('reviewWord: уровень модели важнее — она видит слово в контексте', () => {
  assert.deepEqual(reviewWord({ ...word, level: 'C2' }, 'C1', 'B1'), { ...word, level: 'C2' })
})

test('reviewWord: слова вне списка проходят как есть', () => {
  assert.deepEqual(reviewWord(word, undefined, 'C2'), word)
})

test('isBelow: сравнение по лестнице уровней', () => {
  assert.equal(isBelow('A1', 'B1'), true)
  assert.equal(isBelow('B1', 'B1'), false)
  assert.equal(isBelow('C1', 'B1'), false)
})

test('easiestLevel: производная форма считается по самой простой', async () => {
  // сам `fixed` профиль держит за B2, а `fix` — за A2
  assert.equal(await cefrLevel('fixed'), 'B2')
  assert.equal(await easiestLevel('fixed'), 'A2')
})

test('easiestLevel: слова вне профиля остаются без уровня', async () => {
  assert.equal(await easiestLevel('hedgerows'), undefined)
})
