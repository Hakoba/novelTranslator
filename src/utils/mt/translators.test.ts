import assert from 'node:assert/strict'
import { test } from 'node:test'
import { deeplBaseUrl, deeplTarget, getTranslator, TRANSLATOR_LIST, TRANSLATORS } from './translators'

const CREDENTIALS = { baseUrl: 'https://libre.example/', apiKey: 'key-123:fx', region: '' }

test('deepl: бесплатный ключ уходит на api-free, платный — на api', () => {
  assert.equal(deeplBaseUrl('abc:fx'), 'https://api-free.deepl.com')
  assert.equal(deeplBaseUrl('abc'), 'https://api.deepl.com')
})

test('deepl: цель с региональными вариантами, источник без них', () => {
  assert.equal(deeplTarget('en'), 'EN-US')
  assert.equal(deeplTarget('ru'), 'RU')

  const request = TRANSLATORS.deepl.buildRequest('flash of light', 'en', 'ru', CREDENTIALS)
  const body = JSON.parse(request.body ?? '')

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
  assert.equal(JSON.parse(withKey.body ?? '').api_key, 'key-123:fx')
  // пустой ключ не должен уезжать полем: часть серверов на него ругается
  assert.equal('api_key' in JSON.parse(withoutKey.body ?? ''), false)
})

test('извлечение перевода: оба формата и мусор вместо них', () => {
  assert.equal(TRANSLATORS.deepl.extractText({ translations: [{ text: 'вспышка' }] }), 'вспышка')
  assert.equal(TRANSLATORS.libre.extractText({ translatedText: 'вспышка' }), 'вспышка')
  assert.equal(TRANSLATORS.deepl.extractText({ translations: [] }), '')
  assert.equal(TRANSLATORS.libre.extractText(undefined), '')
})

test('getTranslator: «не переводить» и мусор дают undefined', () => {
  assert.equal(getTranslator('none'), undefined)
  assert.equal(getTranslator('yandex'), undefined)
  assert.equal(getTranslator('deepl')?.id, 'deepl')
})

test('mymemory: пара языков в одном поле, почта — только когда указана', () => {
  const withEmail = TRANSLATORS.mymemory.buildRequest('flash of light', 'en', 'ru', {
    ...CREDENTIALS,
    apiKey: 'reader@example.com',
  })
  const anonymous = TRANSLATORS.mymemory.buildRequest('flash of light', 'en', 'ru', { ...CREDENTIALS, apiKey: '' })

  assert.equal(withEmail.method, 'GET')
  assert.equal(new URL(withEmail.url).searchParams.get('langpair'), 'en|ru')
  assert.equal(new URL(withEmail.url).searchParams.get('q'), 'flash of light')
  assert.equal(new URL(withEmail.url).searchParams.get('de'), 'reader@example.com')
  assert.equal(new URL(anonymous.url).searchParams.has('de'), false)
})

test('mymemory: исчерпанная квота приходит с http 200 и переводом не считается', () => {
  const ok = { responseStatus: 200, responseData: { translatedText: 'вспышка света' } }
  const spent = {
    responseStatus: 429,
    responseData: { translatedText: 'MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY' },
  }

  assert.equal(TRANSLATORS.mymemory.extractText(ok), 'вспышка света')
  assert.equal(TRANSLATORS.mymemory.extractText(spent), '')
  // статус приходит и строкой, и числом — сравнение должно переживать оба
  assert.equal(TRANSLATORS.mymemory.extractText({ ...ok, responseStatus: '200' }), 'вспышка света')
})

test('google: ответ без имён полей склеивается из кусков', () => {
  const request = TRANSLATORS.google.buildRequest('flash of light', 'en', 'ru', CREDENTIALS)
  const params = new URL(request.url).searchParams

  assert.equal(params.get('client'), 'gtx')
  assert.equal(params.get('sl'), 'en')
  assert.equal(params.get('tl'), 'ru')
  assert.equal(
    TRANSLATORS.google.extractText([[['вспышка ', 'flash ', null, null, 10], ['света', 'of light']], null, 'en']),
    'вспышка света',
  )
  assert.equal(TRANSLATORS.google.extractText([[]]), '')
  assert.equal(TRANSLATORS.google.extractText({ translation: 'вспышка' }), '')
})

test('edge и azure: общий формат Microsoft, разная подпись', () => {
  const edge = TRANSLATORS.edge.buildRequest('flash of light', 'en', 'ru', { ...CREDENTIALS, apiKey: 'jwt-token' })
  const azure = TRANSLATORS.azure.buildRequest('flash of light', 'en', 'ru', {
    baseUrl: '',
    apiKey: 'azure-key',
    region: 'westeurope',
  })
  const global = TRANSLATORS.azure.buildRequest('flash of light', 'en', 'ru', {
    baseUrl: '',
    apiKey: 'azure-key',
    region: '',
  })

  assert.equal(edge.headers.Authorization, 'Bearer jwt-token')
  assert.deepEqual(JSON.parse(edge.body ?? ''), [{ Text: 'flash of light' }])
  assert.equal(azure.headers['Ocp-Apim-Subscription-Key'], 'azure-key')
  assert.equal(azure.headers['Ocp-Apim-Subscription-Region'], 'westeurope')
  // ресурс Global региона не имеет, и пустой заголовок он отвергает
  assert.equal('Ocp-Apim-Subscription-Region' in global.headers, false)
  assert.equal(TRANSLATORS.edge.extractText([{ translations: [{ text: 'вспышка света', to: 'ru' }] }]), 'вспышка света')
  assert.equal(TRANSLATORS.azure.extractText([{ translations: [] }]), '')
})

test('lingva: слово и языки уходят путём, адрес — из настроек', () => {
  const request = TRANSLATORS.lingva.buildRequest('flash of light', 'en', 'ru', {
    ...CREDENTIALS,
    baseUrl: 'https://lingva.example/',
  })

  assert.equal(request.url, 'https://lingva.example/api/v1/en/ru/flash%20of%20light')
  assert.equal(request.method, 'GET')
  assert.equal(TRANSLATORS.lingva.extractText({ translation: 'вспышка света' }), 'вспышка света')
})

test('переводчики без ключа не требуют ни ключа, ни адреса — кроме своего инстанса', () => {
  assert.deepEqual(
    TRANSLATOR_LIST.filter((item) => item.requiresKey).map((item) => item.id),
    ['deepl', 'azure'],
  )
  assert.deepEqual(
    TRANSLATOR_LIST.filter((item) => item.requiresUrl).map((item) => item.id),
    ['lingva', 'libre'],
  )
  // неофициальные помечены: интерфейс предупреждает, что такой источник может отвалиться
  assert.deepEqual(
    TRANSLATOR_LIST.filter((item) => item.unofficial).map((item) => item.id),
    ['google', 'edge', 'lingva'],
  )
})

test('пакет: google строками, microsoft и deepl массивами, ответ по позициям', () => {
  const google = TRANSLATORS.google.batch
  const edge = TRANSLATORS.edge.batch
  const deepl = TRANSLATORS.deepl.batch
  assert.ok(google && edge && deepl)

  const googleRequest = google.build(['flash', 'light'], 'en', 'ru', CREDENTIALS)
  assert.equal(new URL(googleRequest.url).searchParams.get('q'), 'flash\nlight')
  assert.deepEqual(
    google.extract([[['вспышка\n', 'flash\n'], ['свет', 'light']], null, 'en'], 2),
    ['вспышка', 'свет'],
  )
  // Google склеил строки по-своему — переводы съехали бы, пакет отвергается
  assert.deepEqual(google.extract([[['вспышка свет', 'flash\nlight']], null, 'en'], 2), [])

  const edgeRequest = edge.build(['flash', 'light'], 'en', 'ru', { ...CREDENTIALS, apiKey: 'jwt' })
  assert.deepEqual(JSON.parse(edgeRequest.body ?? ''), [{ Text: 'flash' }, { Text: 'light' }])
  assert.deepEqual(
    edge.extract([{ translations: [{ text: 'вспышка' }] }, { translations: [] }], 2),
    ['вспышка', ''],
  )
  assert.deepEqual(edge.extract([{ translations: [{ text: 'вспышка' }] }], 2), [])

  const deeplRequest = deepl.build(['flash', 'light'], 'en', 'ru', CREDENTIALS)
  assert.deepEqual(JSON.parse(deeplRequest.body ?? '').text, ['flash', 'light'])
  assert.deepEqual(deepl.extract({ translations: [{ text: 'вспышка' }, { text: 'свет' }] }, 2), ['вспышка', 'свет'])
  assert.deepEqual(deepl.extract({ translations: [{ text: 'вспышка' }] }, 2), [])
})

test('пакет: у mymemory, lingva и libre его нет — слова уходят по одному', () => {
  assert.equal(TRANSLATORS.mymemory.batch, undefined)
  assert.equal(TRANSLATORS.lingva.batch, undefined)
  assert.equal(TRANSLATORS.libre.batch, undefined)
})
