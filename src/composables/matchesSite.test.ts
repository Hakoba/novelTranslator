import assert from 'node:assert/strict'
import { test } from 'node:test'
import { areaPattern, isSensitiveHost, isSiteAllowed, matchesSite } from './matchesSite'

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

test('isSiteAllowed: белый список пропускает только перечисленное', () => {
  const sites = ['https://www.reddit.com/']

  assert.equal(isSiteAllowed('https://www.reddit.com/r/stories', 'allow', sites), true)
  assert.equal(isSiteAllowed('https://example.com/', 'allow', sites), false)
  assert.equal(isSiteAllowed('https://example.com/', 'allow', []), false)
})

test('isSiteAllowed: чёрный список пропускает всё, кроме перечисленного', () => {
  const sites = ['https://www.reddit.com/']

  assert.equal(isSiteAllowed('https://example.com/', 'deny', sites), true)
  assert.equal(isSiteAllowed('https://www.reddit.com/r/stories', 'deny', sites), false)
  assert.equal(isSiteAllowed('https://example.com/', 'deny', []), true)
})

test('isSiteAllowed: чувствительные адреса не разбираются и без записи в списке', () => {
  assert.equal(isSiteAllowed('https://mail.google.com/', 'deny', []), false)
  assert.equal(isSiteAllowed('https://mail.yandex.ru/', 'deny', []), false)
  assert.equal(isSiteAllowed('https://www.paypal.com/', 'deny', []), false)
  assert.equal(isSiteAllowed('https://www.irs.gov/forms', 'deny', []), false)
  assert.equal(isSiteAllowed('http://localhost:5173/', 'deny', []), false)
  assert.equal(isSiteAllowed('https://printer.local/', 'deny', []), false)
  assert.equal(isSiteAllowed('not a url', 'deny', []), false)
})

test('isSensitiveHost: обычные сайты не попадают под правила', () => {
  assert.equal(isSensitiveHost('www.reddit.com'), false)
  assert.equal(isSensitiveHost('novelbin.com'), false)
  assert.equal(isSensitiveHost('royalroad.com'), false)
})

test('isSiteAllowed: со снятой защитой чувствительные адреса тоже разбираются', () => {
  assert.equal(isSiteAllowed('https://mail.google.com/', 'deny', [], false), true)
  assert.equal(isSiteAllowed('https://mail.google.com/', 'deny', ['https://mail.google.com/'], false), false)
  assert.equal(isSiteAllowed('not a url', 'deny', [], false), false)
})

test('isSensitiveHost: банк узнаётся в любой стране, но не по созвучию', () => {
  assert.equal(isSensitiveHost('online.sberbank.ru'), true)
  assert.equal(isSensitiveHost('www.bankofamerica.com'), true)
  assert.equal(isSensitiveHost('www.gov.uk'), true)
  assert.equal(isSensitiveHost('governor-blog.com'), false)
  // цена правила: отличить банк от созвучного домена без словаря нельзя,
  // поэтому у защиты есть выключатель в настройках
  assert.equal(isSensitiveHost('bankofmemes.com'), true)
})
