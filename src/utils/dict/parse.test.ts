import assert from 'node:assert/strict'
import { test } from 'node:test'
import { firstTranslation, parseFreeDictionary, parseYandexLookup } from './parse'
import { dictionaryLinks } from './links'

const YANDEX_RESPONSE = {
  head: {},
  def: [
    {
      text: 'brittle',
      pos: 'adjective',
      ts: 'ˈbrɪtl',
      tr: [
        {
          text: 'хрупкий',
          pos: 'прилагательное',
          syn: [{ text: 'ломкий' }, { text: 'непрочный' }],
          ex: [{ text: 'brittle bones', tr: [{ text: 'хрупкие кости' }] }],
        },
        { text: 'ломкий' },
      ],
    },
  ],
}

const FREE_RESPONSE = [
  {
    word: 'brittle',
    phonetic: '/ˈbɹɪt(ə)l/',
    phonetics: [{ text: '/ˈbrɪtl̩/', audio: 'https://example.com/a.mp3' }],
    meanings: [
      {
        partOfSpeech: 'adjective',
        definitions: [
          { definition: 'Inflexible, liable to break rather than bend.', example: 'a brittle bone' },
        ],
      },
    ],
  },
]

test('parseYandexLookup: переводы, синонимы и транскрипция', () => {
  const result = parseYandexLookup(YANDEX_RESPONSE, 'brittle')

  assert.equal(result?.source, 'yandex')
  assert.equal(result?.transcription, 'ˈbrɪtl')
  assert.equal(result?.senses[0]?.partOfSpeech, 'adjective')
  // повтор «ломкий» из отдельного tr не должен появиться дважды
  assert.deepEqual(result?.senses[0]?.translations, ['хрупкий', 'ломкий', 'непрочный'])
  assert.equal(result?.senses[0]?.example, 'brittle bones')
})

test('parseYandexLookup: слово без переводов даёт undefined', () => {
  assert.equal(parseYandexLookup({ def: [] }, 'zzz'), undefined)
  assert.equal(parseYandexLookup({ def: [{ pos: 'noun', tr: [] }] }, 'zzz'), undefined)
})

test('parseYandexLookup: чужой ответ не роняет разбор', () => {
  assert.equal(parseYandexLookup('<html>error</html>', 'zzz'), undefined)
  assert.equal(parseYandexLookup(null, 'zzz'), undefined)
  assert.equal(parseYandexLookup({ def: 'нет' }, 'zzz'), undefined)
})

test('parseFreeDictionary: определение с примером', () => {
  const result = parseFreeDictionary(FREE_RESPONSE, 'brittle')

  assert.equal(result?.source, 'free')
  assert.equal(result?.transcription, '/ˈbɹɪt(ə)l/')
  assert.equal(result?.senses[0]?.definition, 'Inflexible, liable to break rather than bend.')
  assert.equal(result?.senses[0]?.example, 'a brittle bone')
})

test('parseFreeDictionary: пустой phonetic берётся из phonetics', () => {
  const result = parseFreeDictionary(
    [{ ...FREE_RESPONSE[0], phonetic: '' }],
    'brittle',
  )

  assert.equal(result?.transcription, '/ˈbrɪtl̩/')
})

test('parseFreeDictionary: ответ «слово не найдено» даёт undefined', () => {
  assert.equal(parseFreeDictionary({ title: 'No Definitions Found' }, 'zzz'), undefined)
  assert.equal(parseFreeDictionary([], 'zzz'), undefined)
})

test('firstTranslation: берёт первый перевод, определения не считаются', () => {
  assert.equal(firstTranslation(parseYandexLookup(YANDEX_RESPONSE, 'brittle')), 'хрупкий')
  assert.equal(firstTranslation(parseFreeDictionary(FREE_RESPONSE, 'brittle')), undefined)
  assert.equal(firstTranslation(undefined), undefined)
})

test('dictionaryLinks: пробелы и спецсимволы экранируются', () => {
  const links = dictionaryLinks('flash of light')

  assert.ok(links.every((link) => link.url.includes('flash%20of%20light')))
  assert.deepEqual(
    links.map((link) => link.id),
    ['google', 'yandex', 'reverso', 'multitran', 'wiktionary'],
  )
})

test('dictionaryLinks: пустой запрос ссылок не даёт', () => {
  assert.deepEqual(dictionaryLinks('   '), [])
})
