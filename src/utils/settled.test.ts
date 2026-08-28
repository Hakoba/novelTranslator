import assert from 'node:assert/strict'
import { test } from 'node:test'
import { unwrapSettled } from './settled'

const FALLBACK = ['flash', 'gloom', 'ripple']

function settle(values: (string | Error)[]): PromiseSettledResult<string>[] {
  return values.map((value) =>
    value instanceof Error
      ? { status: 'rejected', reason: value }
      : { status: 'fulfilled', value },
  )
}

test('упавшее слово заменяется исходным, остальные переводы доходят', () => {
  const outcome = unwrapSettled(settle(['вспышка', new Error('переводчик отклонил ключ'), 'рябь']), FALLBACK)

  assert.deepEqual(outcome.values, ['вспышка', 'gloom', 'рябь'])
  // упало одно слово из трёх — источник жив, тревожить читателя нечем
  assert.equal(outcome.error, undefined)
})

test('когда не уцелело ни одного, слова остаются, а причина уходит сообщением', () => {
  const outcome = unwrapSettled(settle([new Error('квота кончилась'), new Error('квота кончилась')]), FALLBACK)

  assert.deepEqual(outcome.values, ['flash', 'gloom'])
  assert.equal(outcome.error, 'квота кончилась')
})

test('пустой список не считается полным провалом', () => {
  assert.deepEqual(unwrapSettled([], []), { values: [] })
})

test('не-Error причина тоже доезжает текстом', () => {
  assert.equal(unwrapSettled([{ status: 'rejected', reason: 'timeout' }], FALLBACK).error, 'timeout')
})
