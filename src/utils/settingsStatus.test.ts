import assert from 'node:assert/strict'
import { test } from 'node:test'
import { needsApiKey } from './settingsStatus'

test('needsApiKey: локальной модели ключ не нужен', () => {
  assert.equal(needsApiKey('http://localhost:1234', ''), false)
  assert.equal(needsApiKey('http://127.0.0.1:11434', ''), false)
  assert.equal(needsApiKey('http://ollama.local:11434', ''), false)
})

test('needsApiKey: облако без ключа', () => {
  assert.equal(needsApiKey('https://api.anthropic.com', ''), true)
  assert.equal(needsApiKey('https://api.openai.com', '   '), true)
})

test('needsApiKey: облако с ключом', () => {
  assert.equal(needsApiKey('https://api.anthropic.com', 'sk-ant-123'), false)
})

test('needsApiKey: кривой адрес не считается недонастроенным ключом', () => {
  assert.equal(needsApiKey('', ''), false)
  assert.equal(needsApiKey('не адрес', ''), false)
})
