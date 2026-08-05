import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildTermsPattern, matchedGroupIndex, normalizeTerms } from './terms'

function matches(groups: string[][], text: string): string[] {
  const source = buildTermsPattern(groups.map(normalizeTerms))
  if (!source) return []

  return text.match(new RegExp(source, 'giu')) ?? []
}

/** Что нашлось и какой группой — так же, как это читает подсветка */
function tagged(groups: string[][], text: string): string[] {
  const source = buildTermsPattern(groups.map(normalizeTerms))
  if (!source) return []

  const pattern = new RegExp(source, 'giu')
  const result: string[] = []
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    result.push(`${matchedGroupIndex(match)}:${match[0]}`)
  }

  return result
}

test('buildTermsPattern: пустой список даёт undefined', () => {
  assert.equal(buildTermsPattern([]), undefined)
  assert.equal(buildTermsPattern([[], []]), undefined)
  assert.equal(buildTermsPattern([normalizeTerms(['', '   '])]), undefined)
})

test('buildTermsPattern: длинная фраза выигрывает у короткого слова внутри неё', () => {
  assert.deepEqual(
    matches([['light', 'flash of light']], 'A flash of light in the dark.'),
    ['flash of light'],
  )
})

test('buildTermsPattern: слово не находится внутри другого слова', () => {
  assert.deepEqual(matches([['art']], 'The start of art.'), ['art'])
  assert.deepEqual(matches([['ancient']], 'ancients walked here'), [])
})

test('buildTermsPattern: регистр не важен, текст сохраняется как в оригинале', () => {
  assert.deepEqual(
    matches([['brittle']], 'Brittle bones and brittle pride.'),
    ['Brittle', 'brittle'],
  )
})

test('buildTermsPattern: спецсимволы регулярки экранируются', () => {
  assert.deepEqual(matches([['c++', 'a.b']], 'code in c++ and a.b but not axb'), ['c++', 'a.b'])
})

test('normalizeTerms: повторы и пробелы схлопываются', () => {
  assert.deepEqual(normalizeTerms(['word', 'word', ' word ', '']), ['word'])
})

test('matchedGroupIndex: каждое совпадение знает свою группу', () => {
  assert.deepEqual(
    tagged([['brittle'], ['ancient']], 'A brittle and ancient thing.'),
    ['0:brittle', '1:ancient'],
  )
})

test('matchedGroupIndex: пустая группа не сдвигает номера остальных', () => {
  assert.deepEqual(tagged([[], ['ancient']], 'An ancient tome.'), ['0:ancient'])
})

test('границы проверяются по исходному тексту, а не по остаткам после первой группы', () => {
  // «-bound» примыкает к «storm» вплотную: это часть одного слова, подсвечивать нечего
  assert.deepEqual(tagged([['storm'], ['-bound']], 'the storm-bound ship'), ['0:storm'])
})
