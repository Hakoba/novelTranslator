import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dictionaryLinks } from './links'

test('dictionaryLinks: коды языков подставляются в адреса', () => {
  const links = dictionaryLinks('flash of light', { source: 'de', target: 'fr' })
  const byId = Object.fromEntries(links.map((link) => [link.id, link.url]))

  assert.match(byId.google, /sl=de&tl=fr/)
  assert.match(byId.yandex, /source_lang=de&target_lang=fr/)
  assert.match(byId.reverso, /translation\/german-french\//)
  // пробелы в адресе ломают ссылку
  assert.match(byId.google, /flash%20of%20light/)
})

test('dictionaryLinks: Мультитран только для англо-русской пары', () => {
  const ids = (langs: { source: string; target: string }): string[] =>
    dictionaryLinks('word', langs).map((link) => link.id)

  assert.ok(ids({ source: 'en', target: 'ru' }).includes('multitran'))
  assert.ok(!ids({ source: 'en', target: 'de' }).includes('multitran'))
})

test('dictionaryLinks: пустой запрос не даёт ссылок', () => {
  assert.deepEqual(dictionaryLinks('   ', { source: 'en', target: 'ru' }), [])
})
