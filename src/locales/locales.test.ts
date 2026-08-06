import assert from 'node:assert/strict'
import { test } from 'node:test'
import en from './en'
import ru from './ru'
import es from './es'
import pt from './pt'
import zh from './zh'
import ko from './ko'

/** Плоский список ключей: `settings.model.title` и так далее */
function keys(messages: object, prefix = ''): string[] {
  return Object.entries(messages).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key

    return typeof value === 'object' && value !== null ? keys(value, path) : [path]
  })
}

const REFERENCE = keys(en)

/** Локаль без ключа не падает — она молча показывает английский, и пропуск живёт месяцами */
for (const [name, messages] of Object.entries({ ru, es, pt, zh, ko })) {
  test(`локаль ${name}: набор ключей совпадает с английским`, () => {
    const actual = keys(messages)
    assert.deepEqual(actual.filter((key) => !REFERENCE.includes(key)), [], 'лишние ключи')
    assert.deepEqual(REFERENCE.filter((key) => !actual.includes(key)), [], 'пропущенные ключи')
  })
}

test('формы множественного числа: три в русском, две в европейских, одна в азиатских', () => {
  const forms = (message: string): number => message.split('|').length

  assert.equal(forms(ru.common.words), 3)
  assert.equal(forms(en.common.words), 2)
  assert.equal(forms(es.common.words), 2)
  assert.equal(forms(pt.common.words), 2)
  assert.equal(forms(zh.common.words), 1)
  assert.equal(forms(ko.common.words), 1)
})
