import assert from 'node:assert/strict'
import { test } from 'node:test'
import { pluralIndex } from './plural'

test('pluralIndex: три русские формы, включая ловушки 11–14 и 21–22', () => {
  assert.equal(pluralIndex(1), 0)
  assert.equal(pluralIndex(2), 1)
  assert.equal(pluralIndex(5), 2)
  assert.equal(pluralIndex(11), 2)
  assert.equal(pluralIndex(21), 0)
  assert.equal(pluralIndex(22), 1)
  assert.equal(pluralIndex(0), 2)
})
