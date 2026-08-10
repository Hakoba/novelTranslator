import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { DictionaryEntry } from '@/types/words'
import { isTargetLanguageText, matchesTranslate, pickImmersionWords } from './immersion'

const NOW = 1_700_000_000_000
const DAY = 24 * 60 * 60 * 1000

let nextId = 0
function entry(patch: Partial<DictionaryEntry> = {}): DictionaryEntry {
  nextId += 1

  return {
    id: String(nextId),
    original: `word${nextId}`,
    translate: 'работа',
    addedAt: 0,
    updatedAt: 0,
    ...patch,
  }
}

test('matchesTranslate: точное совпадение без учёта регистра', () => {
  assert.ok(matchesTranslate('Работа', 'работа'))
  assert.ok(matchesTranslate('мир', 'Мир'))
})

test('matchesTranslate: окончания покрываются общей основой', () => {
  assert.ok(matchesTranslate('работой', 'работа'))
  assert.ok(matchesTranslate('красным', 'красный'))
})

test('matchesTranslate: короткая основа и супплетивные формы не совпадают', () => {
  assert.equal(matchesTranslate('бег', 'бегать'), false)
  assert.equal(matchesTranslate('человеку', 'люди'), false)
  assert.equal(matchesTranslate('мире', 'мир'), false)
})

test('pickImmersionWords: слово внутри слова не считается вхождением', () => {
  const picks = pickImmersionWords('мировоззрение растёт', [entry({ translate: 'мир' })], NOW)

  assert.deepEqual(picks, [])
})

test('pickImmersionWords: пустой словарь и пустой текст', () => {
  assert.deepEqual(pickImmersionWords('текст про работу', [], NOW), [])
  assert.deepEqual(pickImmersionWords('', [entry()], NOW), [])
})

test('pickImmersionWords: словоформа возвращается как в тексте', () => {
  const picks = pickImmersionWords('Работой доволен.', [entry()], NOW)

  assert.equal(picks.length, 1)
  assert.equal(picks[0]?.form, 'Работой')
})

test('pickImmersionWords: одна запись — одно вхождение', () => {
  const picks = pickImmersionWords('работа снова. работа и опять. работа.', [entry()], NOW)

  assert.equal(picks.length, 1)
})

test('pickImmersionWords: не больше одного вкрапления на предложение', () => {
  const picks = pickImmersionWords('первый и второй рядом. третий отдельно.', [
    entry({ translate: 'первый' }),
    entry({ translate: 'второй' }),
    entry({ translate: 'третий' }),
  ], NOW)

  assert.deepEqual(picks.map((pick) => pick.form), ['первый', 'третий'])
})

test('pickImmersionWords: приоритет — пора повторять, потом новые, потом остальные', () => {
  const closed = entry({ translate: 'первое', reviews: 1, dueAt: NOW + DAY })
  const fresh = entry({ translate: 'второе' })
  const due = entry({ translate: 'третье', reviews: 2, dueAt: NOW - DAY })

  const picks = pickImmersionWords('первое слово. второе слово. третье слово.', [closed, fresh, due], NOW)

  assert.deepEqual(picks.map((pick) => pick.entry.id), [due.id, fresh.id, closed.id])
})

test('pickImmersionWords: лимит на страницу, слова со сроком идут первыми', () => {
  // основы различаются первой буквой: иначе слова совпали бы друг с другом
  const letters = 'абвгдежзиклмнопрстуф'
  const words = Array.from(letters, (letter) => `${letter}слово`)
  const entries = words.map((word, index) =>
    entry(index === words.length - 1
      ? { translate: word, reviews: 1, dueAt: NOW - DAY }
      : { translate: word }),
  )

  const picks = pickImmersionWords(words.map((word) => `${word}.`).join(' '), entries, NOW)

  assert.equal(picks.length, 15)
  assert.equal(picks[0]?.form, words[words.length - 1])
})

test('isTargetLanguageText: русская страница при паре en→ru', () => {
  assert.ok(isTargetLanguageText('Это русский текст про словарь и чтение.', 'ru', 'en'))
  assert.equal(isTargetLanguageText('This page is entirely in English.', 'ru', 'en'), false)
})

test('isTargetLanguageText: смешанный текст ниже порога не проходит', () => {
  assert.equal(isTargetLanguageText('слово word слово word слово word', 'ru', 'en'), false)
})

test('isTargetLanguageText: общая письменность пары выключает детекцию', () => {
  assert.equal(isTargetLanguageText('Página en español con muchas palabras.', 'es', 'en'), false)
})

test('isTargetLanguageText: пустой текст и неизвестный язык', () => {
  assert.equal(isTargetLanguageText('', 'ru', 'en'), false)
  assert.equal(isTargetLanguageText('текст', 'xx', 'en'), false)
})
