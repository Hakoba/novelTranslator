import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dedupeBlocks } from './pageText'

test('dedupeBlocks: повторы убираются, порядок сохраняется', () => {
  assert.deepEqual(
    dedupeBlocks(['первый абзац', 'первый абзац', 'второй абзац', 'первый абзац']),
    ['первый абзац', 'второй абзац'],
  )
})

test('dedupeBlocks: разные строки не трогаются', () => {
  const blocks = ['a', 'b', 'c']
  assert.deepEqual(dedupeBlocks(blocks), blocks)
})

test('dedupeBlocks: пустой список', () => {
  assert.deepEqual(dedupeBlocks([]), [])
})
