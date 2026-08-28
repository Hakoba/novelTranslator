import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  BACKUP_VERSION,
  backupFileName,
  backupWordCount,
  buildBackup,
  parseBackup,
  serializeBackup,
} from './backup'
import { DICTIONARY_KEY } from './dictionary'

const NOW = 1_700_000_000_000

function backupText(patch: Record<string, unknown> = {}): string {
  return JSON.stringify({
    app: 'erudit',
    version: BACKUP_VERSION,
    createdAt: NOW,
    appVersion: '1.0.0',
    sync: {},
    local: {},
    ...patch,
  })
}

test('копия и разбор: хранилища доезжают как есть', () => {
  const file = buildBackup({
    sync: { 'reader-settings': { level: 'B1' } },
    local: { [DICTIONARY_KEY]: [{ original: 'word' }] },
    appVersion: '1.0.0',
    now: NOW,
  })

  const restored = parseBackup(serializeBackup(file))

  assert.deepEqual(restored.sync, file.sync)
  assert.deepEqual(restored.local, file.local)
  assert.equal(restored.createdAt, NOW)
  assert.equal(restored.appVersion, '1.0.0')
})

test('чужой или битый файл отвергается кодом', () => {
  assert.throws(() => parseBackup('не json'), /backup-broken/)
  assert.throws(() => parseBackup('[]'), /backup-foreign/)
  assert.throws(() => parseBackup(backupText({ app: 'other' })), /backup-foreign/)
  assert.throws(() => parseBackup(backupText({ sync: 'нет' })), /backup-broken/)
})

test('копия из будущей версии не разбирается вслепую', () => {
  assert.throws(() => parseBackup(backupText({ version: BACKUP_VERSION + 1 })), /backup-newer/)
  assert.throws(() => parseBackup(backupText({ version: 'один' })), /backup-newer/)
})

test('счёт слов: надгробия удалённых не в счёт', () => {
  const file = parseBackup(
    backupText({
      local: {
        [DICTIONARY_KEY]: [{ original: 'a' }, { original: 'b' }, { original: 'c', deletedAt: NOW }],
      },
    }),
  )

  assert.equal(backupWordCount(file), 2)
})

test('счёт слов: словаря в копии может не быть вовсе', () => {
  assert.equal(backupWordCount(parseBackup(backupText())), 0)
  assert.equal(backupWordCount(parseBackup(backupText({ local: { [DICTIONARY_KEY]: 'нет' } }))), 0)
})

test('имя файла — с датой копии', () => {
  assert.equal(backupFileName(NOW), 'erudit-backup-2023-11-14.json')
})
