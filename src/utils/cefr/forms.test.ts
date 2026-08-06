import assert from 'node:assert/strict'
import { test } from 'node:test'
import { baseForms } from './forms'

test('baseForms: само слово всегда первое', () => {
  assert.equal(baseForms('Sword')[0], 'sword')
  assert.deepEqual(baseForms('  '), [])
})

test('baseForms: множественное число', () => {
  assert.ok(baseForms('dogs').includes('dog'))
  assert.ok(baseForms('boxes').includes('box'))
  assert.ok(baseForms('cities').includes('city'))
})

test('baseForms: прошедшее время и герундий', () => {
  assert.ok(baseForms('walked').includes('walk'))
  assert.ok(baseForms('hoped').includes('hope'))
  assert.ok(baseForms('tried').includes('try'))
  assert.ok(baseForms('stopped').includes('stop'))
  assert.ok(baseForms('running').includes('run'))
  assert.ok(baseForms('hoping').includes('hope'))
})

test('baseForms: степени сравнения и наречия', () => {
  assert.ok(baseForms('bigger').includes('big'))
  assert.ok(baseForms('largest').includes('large'))
  assert.ok(baseForms('quickly').includes('quick'))
})

test('baseForms: короткое слово не режем до огрызка', () => {
  assert.deepEqual(baseForms('is'), ['is'])
  assert.deepEqual(baseForms('as'), ['as'])
})
