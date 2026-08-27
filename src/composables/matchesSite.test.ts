import assert from 'node:assert/strict'
import { test } from 'node:test'
import { areaPattern, matchesSite } from './matchesSite'

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

test('areaPattern: пост и лента одного сайта дают разные паттерны', () => {
  const post = areaPattern('https://reddit.com/r/nosleep/comments/1abcdef/some-title/')
  const feed = areaPattern('https://reddit.com/r/nosleep/')

  assert.equal(post, 'https://reddit.com/r/nosleep/comments/')
  assert.equal(feed, 'https://reddit.com/r/nosleep/')
  // паттерн поста подходит любому посту саба, но не ленте
  assert.equal(matchesSite('https://reddit.com/r/nosleep/comments/9zzz/other/', post), true)
  assert.equal(matchesSite('https://reddit.com/r/nosleep/', post), false)
  // паттерн ленты шире и покрывает пост — при выборе побеждает более длинный
  assert.equal(matchesSite('https://reddit.com/r/nosleep/comments/9zzz/other/', feed), true)
})

test('areaPattern: путь без идентификаторов остаётся целиком', () => {
  assert.equal(areaPattern('https://royalroad.com/fiction/12345/name/chapter/678'), 'https://royalroad.com/fiction/')
  assert.equal(areaPattern('https://example.com/'), 'https://example.com/')
  assert.equal(areaPattern('not a url'), 'not a url')
})
