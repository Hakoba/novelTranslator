import assert from 'node:assert/strict'
import { test } from 'node:test'
import { deeplBaseUrl, deeplTarget, getTranslator, TRANSLATORS } from './translators'

const CREDENTIALS = { baseUrl: 'https://libre.example/', apiKey: 'key-123:fx' }

test('deepl: бесплатный ключ уходит на api-free, платный — на api', () => {
  assert.equal(deeplBaseUrl('abc:fx'), 'https://api-free.deepl.com')
  assert.equal(deeplBaseUrl('abc'), 'https://api.deepl.com')
})

test('deepl: цель с региональными вариантами, источник без них', () => {
  assert.equal(deeplTarget('en'), 'EN-US')
  assert.equal(deeplTarget('ru'), 'RU')

  const request = TRANSLATORS.deepl.buildRequest('flash of light', 'en', 'ru', CREDENTIALS)
  const body = JSON.parse(request.body)

  assert.equal(request.url, 'https://api-free.deepl.com/v2/translate')
  assert.equal(request.headers.Authorization, 'DeepL-Auth-Key key-123:fx')
  assert.deepEqual(body.text, ['flash of light'])
  assert.equal(body.source_lang, 'EN')
  assert.equal(body.target_lang, 'RU')
})

test('libre: адрес из настроек, ключ необязателен', () => {
  const withKey = TRANSLATORS.libre.buildRequest('word', 'en', 'ru', CREDENTIALS)
  const withoutKey = TRANSLATORS.libre.buildRequest('word', 'en', 'ru', { ...CREDENTIALS, apiKey: '' })

  assert.equal(withKey.url, 'https://libre.example/translate')
  assert.equal(JSON.parse(withKey.body).api_key, 'key-123:fx')
  // пустой ключ не должен уезжать полем: часть серверов на него ругается
  assert.equal('api_key' in JSON.parse(withoutKey.body), false)
})

test('извлечение перевода: оба формата и мусор вместо них', () => {
  assert.equal(TRANSLATORS.deepl.extractText({ translations: [{ text: 'вспышка' }] }), 'вспышка')
  assert.equal(TRANSLATORS.libre.extractText({ translatedText: 'вспышка' }), 'вспышка')
  assert.equal(TRANSLATORS.deepl.extractText({ translations: [] }), '')
  assert.equal(TRANSLATORS.libre.extractText(undefined), '')
})

test('getTranslator: «не переводить» и мусор дают undefined', () => {
  assert.equal(getTranslator('none'), undefined)
  assert.equal(getTranslator('google'), undefined)
  assert.equal(getTranslator('deepl')?.id, 'deepl')
})
