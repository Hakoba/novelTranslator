import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MAX_CHARS, appendedTail, dedupeBlocks, joinBlocks, limitChars, normalizeWhitespace } from './blocks'
import { findRule } from './rules'
import { pickBestIndex, scoreCandidate } from './score'

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

test('normalizeWhitespace: переносы и повторные пробелы схлопываются', () => {
  assert.equal(normalizeWhitespace('  Он\n\tоткрыл   дверь  '), 'Он открыл дверь')
})

test('joinBlocks: короткие обрывки выбрасываются', () => {
  const long = 'Достаточно длинная строка, которая проходит порог по символам.'
  assert.equal(joinBlocks(['Дальше →', long, 'Глава 12']), long)
})

test('joinBlocks: текст собирается целиком, обрезки тут нет', () => {
  const block = 'а'.repeat(5000)
  assert.equal(joinBlocks([block, block.replace('а', 'б')]).length, 10001)
})

test('limitChars: длинный текст обрезается по лимиту', () => {
  assert.equal(limitChars('а'.repeat(10000)).length, MAX_CHARS)
  assert.equal(limitChars('коротко'), 'коротко')
})

test('appendedTail: догруженная глава отдаётся без прежнего текста', () => {
  assert.equal(appendedTail('Глава первая.', 'Глава первая.\nГлава вторая.'), '\nГлава вторая.')
})

test('appendedTail: страницу заменили — разбираем целиком', () => {
  assert.equal(appendedTail('Глава первая.', 'Совсем другой текст.'), 'Совсем другой текст.')
})

test('appendedTail: без прошлого разбора весь текст новый', () => {
  assert.equal(appendedTail('', 'Глава первая.'), 'Глава первая.')
})

test('appendedTail: текст не изменился — разбирать нечего', () => {
  assert.equal(appendedTail('Глава первая.', 'Глава первая.'), '')
})

test('findRule: домен и поддомены, www не мешает', () => {
  assert.equal(findRule('www.reddit.com')?.host, 'reddit.com')
  assert.equal(findRule('old.reddit.com')?.host, 'reddit.com')
  assert.equal(findRule('WEBNOVEL.COM')?.host, 'webnovel.com')
})

test('findRule: чужой домен не цепляется похожим окончанием', () => {
  assert.equal(findRule('notreddit.com'), undefined)
  assert.equal(findRule('example.com'), undefined)
})

test('scoreCandidate: короткий блок не считается текстом', () => {
  assert.equal(scoreCandidate({ textLength: 150, linkTextLength: 0 }), 0)
})

test('scoreCandidate: сплошные ссылки отбрасываются как навигация', () => {
  assert.equal(scoreCandidate({ textLength: 1000, linkTextLength: 800 }), 0)
})

test('scoreCandidate: редкие ссылки почти не штрафуют', () => {
  assert.equal(scoreCandidate({ textLength: 1000, linkTextLength: 100 }), 900)
})

test('pickBestIndex: длинный текст выигрывает у навигации, даже если та длиннее', () => {
  const index = pickBestIndex([
    { textLength: 3000, linkTextLength: 2900 },
    { textLength: 1200, linkTextLength: 40 },
  ])

  assert.equal(index, 1)
})

test('pickBestIndex: ни одного пригодного кандидата', () => {
  assert.equal(pickBestIndex([{ textLength: 20, linkTextLength: 0 }]), -1)
  assert.equal(pickBestIndex([]), -1)
})
