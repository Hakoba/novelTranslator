import assert from 'node:assert/strict'
import { test } from 'node:test'
import { findSentence } from './sentence'

const TEXT = 'He opened the door. A flash of light blinded him for a moment! Then silence.'

test('findSentence: берёт предложение со словом, а не весь текст', () => {
  assert.equal(findSentence(TEXT, 'flash of light'), 'A flash of light blinded him for a moment!')
})

test('findSentence: регистр не важен', () => {
  assert.equal(findSentence(TEXT, 'FLASH OF LIGHT'), 'A flash of light blinded him for a moment!')
})

test('findSentence: первое предложение — без обрезки начала', () => {
  assert.equal(findSentence(TEXT, 'opened'), 'He opened the door.')
})

test('findSentence: последнее предложение без точки в конце', () => {
  assert.equal(findSentence('Ends abruptly here', 'abruptly'), 'Ends abruptly here')
})

test('findSentence: границей служит и перевод строки', () => {
  assert.equal(findSentence('Первый абзац\nВторой абзац\nТретий', 'Второй'), 'Второй абзац')
})

test('findSentence: слова нет в тексте', () => {
  assert.equal(findSentence(TEXT, 'dragon'), undefined)
})

test('findSentence: пустые аргументы', () => {
  assert.equal(findSentence('', 'word'), undefined)
  assert.equal(findSentence(TEXT, '   '), undefined)
})

test('findSentence: длинное предложение обрезается многоточием', () => {
  const long = `${'word '.repeat(100)}target.`
  const result = findSentence(long, 'word')

  assert.ok(result)
  assert.ok(result.length <= 301, `ожидали не длиннее 301 символа, получили ${result.length}`)
  assert.ok(result.endsWith('…'))
})
