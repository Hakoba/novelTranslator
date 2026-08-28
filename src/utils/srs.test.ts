import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { DictionaryEntry } from '@/types/words'
import {
  countNew,
  countProgress,
  dueEntries,
  dueInDays,
  intervalDays,
  nextDueAt,
  reviewEntry,
} from './srs'

const DAY = 24 * 60 * 60 * 1000
const NOW = 1_000 * DAY

function entry(patch: Partial<DictionaryEntry> = {}): DictionaryEntry {
  return {
    id: patch.original ?? 'id',
    original: 'word',
    translate: 'слово',
    addedAt: 0,
    updatedAt: 0,
    ...patch,
  }
}

test('reviewEntry: первое верное повторение откладывает на день', () => {
  const progress = reviewEntry(entry(), true, NOW)

  assert.equal(progress.dueAt, NOW + DAY)
  assert.equal(progress.intervalStep, 0)
  assert.equal(progress.reviews, 1)
  assert.equal(progress.lapses, 0)
})

test('reviewEntry: серия верных ответов растит интервал по лестнице', () => {
  const days = [1, 3, 7, 16, 35, 90]
  let current = entry()

  for (const expected of days) {
    const progress = reviewEntry(current, true, NOW)
    assert.equal((progress.dueAt ?? 0) - NOW, expected * DAY, `шаг ${current.intervalStep}`)
    current = { ...current, ...progress }
  }
})

test('reviewEntry: дальше последнего шага интервал не растёт', () => {
  const progress = reviewEntry(entry({ intervalStep: 99 }), true, NOW)

  assert.equal((progress.dueAt ?? 0) - NOW, 90 * DAY)
})

test('reviewEntry: ошибка сбрасывает лестницу и считает промах', () => {
  const progress = reviewEntry(entry({ intervalStep: 4, reviews: 9, lapses: 1 }), false, NOW)

  assert.equal(progress.intervalStep, 0)
  assert.equal((progress.dueAt ?? 0) - NOW, DAY)
  assert.equal(progress.reviews, 10)
  assert.equal(progress.lapses, 2)
})

test('intervalDays: отрицательный шаг не ломает лестницу', () => {
  assert.equal(intervalDays(-5), 1)
})

test('dueEntries: новые и просроченные попадают, будущие — нет', () => {
  const entries = [
    entry({ original: 'future', dueAt: NOW + DAY }),
    entry({ original: 'fresh' }),
    entry({ original: 'overdue', dueAt: NOW - 5 * DAY }),
    entry({ original: 'removed', deletedAt: NOW }),
  ]

  assert.deepEqual(
    dueEntries(entries, NOW).map((item) => item.original),
    ['fresh', 'overdue'],
  )
})

test('countNew: считает нетренированные, кроме удалённых', () => {
  const entries = [
    entry({ original: 'a' }),
    entry({ original: 'b', reviews: 3 }),
    entry({ original: 'c', deletedAt: NOW }),
  ]

  assert.equal(countNew(entries), 1)
})

test('dueInDays: нетренированное и просроченное — ноль, остальное вверх до дня', () => {
  assert.equal(dueInDays(undefined, NOW), 0)
  assert.equal(dueInDays(NOW - DAY, NOW), 0)
  assert.equal(dueInDays(NOW + 7 * DAY, NOW), 7)
  assert.equal(dueInDays(NOW + DAY / 3, NOW), 1)
})

test('nextDueAt: ближайшая будущая дата, иначе undefined', () => {
  const entries = [
    entry({ original: 'a', dueAt: NOW + 5 * DAY }),
    entry({ original: 'b', dueAt: NOW + 2 * DAY }),
    entry({ original: 'c', dueAt: NOW - DAY }),
  ]

  assert.equal(nextDueAt(entries, NOW), NOW + 2 * DAY)
  assert.equal(nextDueAt([entry({ dueAt: NOW - DAY })], NOW), undefined)
})

test('countProgress: стадии словаря — новые, в работе, освоенные', () => {
  const entries = [
    entry({ id: 'a' }),
    entry({ id: 'b', reviews: 1, intervalStep: 0 }),
    entry({ id: 'c', reviews: 9, intervalStep: 3 }),
    entry({ id: 'd', reviews: 9, intervalStep: 5 }),
    entry({ id: 'e', reviews: 4, intervalStep: 4, deletedAt: 1 }),
  ]

  assert.deepEqual(countProgress(entries), { fresh: 1, learning: 1, learned: 2 })
})
