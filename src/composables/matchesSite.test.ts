import assert from 'node:assert/strict'
import { test } from 'node:test'
import { matchesSite } from './matchesSite'

test('matchesSite: точное совпадение хоста', () => {
  assert.equal(matchesSite('https://novelbin.com/book/1', 'https://novelbin.com/'), true)
  assert.equal(matchesSite('https://other.com/book/1', 'https://novelbin.com/'), false)
})

test('matchesSite: протокол учитывается', () => {
  assert.equal(matchesSite('http://novelbin.com/', 'https://novelbin.com/'), false)
})

test('matchesSite: путь как префикс', () => {
  assert.equal(matchesSite('https://novelbin.com/book/1', 'https://novelbin.com/book'), true)
  assert.equal(matchesSite('https://novelbin.com/news', 'https://novelbin.com/book'), false)
})

test('matchesSite: www не мешает совпадению', () => {
  assert.equal(matchesSite('https://www.reddit.com/r/nosleep/', 'https://reddit.com/'), true)
  assert.equal(matchesSite('https://reddit.com/r/nosleep/', 'https://www.reddit.com/'), true)
  assert.equal(matchesSite('https://old.reddit.com/', 'https://reddit.com/'), false)
})

test('matchesSite: поддомены через *.', () => {
  assert.equal(matchesSite('https://www.novelbin.com/', 'https://*.novelbin.com/'), true)
  assert.equal(matchesSite('https://novelbin.com/', 'https://*.novelbin.com/'), true)
  assert.equal(matchesSite('https://novelbin.com.evil.io/', 'https://*.novelbin.com/'), false)
})

test('matchesSite: мусор не матчится', () => {
  assert.equal(matchesSite('not a url', 'https://novelbin.com/'), false)
})
