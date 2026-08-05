import assert from 'node:assert/strict'
import { test } from 'node:test'
import { extractContent, parseWords } from './llmParse'

test('parseWords: чистый JSON', () => {
  assert.deepEqual(parseWords('[{"original":"pinned","translate":"прижатый"}]'), [
    { original: 'pinned', translate: 'прижатый' },
  ])
})

test('parseWords: JSON в code fence и с текстом вокруг', () => {
  const content = 'Вот результат:\n```json\n[{"original":"subdued","translate":"усмирил"}]\n```\nГотово.'
  assert.deepEqual(parseWords(content), [{ original: 'subdued', translate: 'усмирил' }])
})

test('parseWords: уровень нормализуется, мусорный отбрасывается', () => {
  const levels = parseWords(`[
    {"original":"a","translate":"а","level":" b2 "},
    {"original":"b","translate":"б","level":"C1"},
    {"original":"c","translate":"в","level":"upper-intermediate"},
    {"original":"d","translate":"г","level":3}
  ]`).map((word) => word.level)

  assert.deepEqual(levels, ['B2', 'C1', undefined, undefined])
})

test('parseWords: мусор и неполные объекты отбрасываются', () => {
  assert.deepEqual(parseWords('модель отказалась отвечать'), [])
  assert.deepEqual(parseWords('[{"original":"hummed"},{"translate":"напевал"},42]'), [])
})

test('extractContent: достаёт content из chat/completions', () => {
  assert.equal(extractContent({ choices: [{ message: { content: 'ok' } }] }), 'ok')
  assert.equal(extractContent({ choices: [] }), '')
  assert.equal(extractContent(undefined), '')
})
