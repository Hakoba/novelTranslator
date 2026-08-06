import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getProvider, PROVIDERS, type ChatMessage } from './providers'

const MESSAGES: ChatMessage[] = [
  { role: 'system', content: 'You are helpful.' },
  { role: 'user', content: 'Rules' },
  { role: 'user', content: 'Text' },
]

const CREDENTIALS = { baseUrl: 'https://example.com/', model: 'some-model', apiKey: 'secret' }

test('openai: сообщения уходят как есть, ключ — в Authorization', () => {
  const request = PROVIDERS.openai.buildRequest(MESSAGES, CREDENTIALS, 0.2)

  // хвостовой слэш в адресе из настроек не должен давать двойной
  assert.equal(request.url, 'https://example.com/v1/chat/completions')
  assert.equal(request.headers.Authorization, 'Bearer secret')
  assert.deepEqual(JSON.parse(request.body).messages, MESSAGES)
})

test('openai: без ключа заголовок авторизации не ставится', () => {
  const request = PROVIDERS.openai.buildRequest(MESSAGES, { ...CREDENTIALS, apiKey: '' }, 0.2)

  assert.equal(request.headers.Authorization, undefined)
})

test('anthropic: system отдельным полем, user-сообщения склеены', () => {
  const request = PROVIDERS.anthropic.buildRequest(MESSAGES, CREDENTIALS, 0.2)
  const body = JSON.parse(request.body)

  assert.equal(request.url, 'https://example.com/v1/messages')
  assert.equal(request.headers['x-api-key'], 'secret')
  assert.equal(body.system, 'You are helpful.')
  assert.equal(body.messages.length, 1)
  assert.equal(body.messages[0].content, 'Rules\n\nText')
  // без max_tokens Anthropic отвечает 400
  assert.ok(body.max_tokens > 0)
})

test('gemini: ключ в заголовке, а не в адресе', () => {
  const request = PROVIDERS.gemini.buildRequest(MESSAGES, CREDENTIALS, 0.2)

  assert.equal(request.url, 'https://example.com/v1beta/models/some-model:generateContent')
  assert.ok(!request.url.includes('secret'))
  assert.equal(request.headers['x-goog-api-key'], 'secret')
  assert.equal(JSON.parse(request.body).contents[0].parts[0].text, 'Rules\n\nText')
})

test('извлечение текста: каждый формат ответа и мусор вместо него', () => {
  assert.equal(
    PROVIDERS.openai.extractText({ choices: [{ message: { content: 'ok' } }] }),
    'ok',
  )
  assert.equal(
    PROVIDERS.anthropic.extractText({ content: [{ type: 'text', text: 'ok' }] }),
    'ok',
  )
  assert.equal(
    PROVIDERS.gemini.extractText({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }),
    'ok',
  )

  assert.equal(PROVIDERS.anthropic.extractText({ content: [] }), '')
  assert.equal(PROVIDERS.gemini.extractText({ candidates: [{}] }), '')
  assert.equal(PROVIDERS.openai.extractText(undefined), '')
})

test('getProvider: незнакомый идентификатор откатывается к OpenAI', () => {
  assert.equal(getProvider('claude-3-opus').id, 'openai')
  assert.equal(getProvider('gemini').id, 'gemini')
})
