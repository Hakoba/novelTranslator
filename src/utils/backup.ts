import { DICTIONARY_KEY } from './dictionary'

/**
 * Резервная копия — это оба хранилища расширения целиком, как есть.
 * Своего сервера у расширения нет, словарь лежит в `storage.local` и никуда
 * не синхронизируется, так что файл — единственный способ увезти собранное
 * на другой компьютер (см. `deferred.md`, «Синхронизация словаря»).
 *
 * Копируем хранилища снимком, а не полями настроек: перечислять ключи руками
 * значит забывать про новые. Логика — без браузерных API, чтобы тестировать в node.
 */

/** Растёт, только если раскладка хранилищ изменится несовместимо */
export const BACKUP_VERSION = 1

const APP = 'erudit'

export type StorageSnapshot = Record<string, unknown>

export type BackupFile = {
  app: typeof APP
  version: number
  createdAt: number
  /** Версия расширения, которая делала копию — пригодится в баг-репорте */
  appVersion: string
  sync: StorageSnapshot
  local: StorageSnapshot
}

export function buildBackup(input: {
  sync: StorageSnapshot
  local: StorageSnapshot
  appVersion: string
  now: number
}): BackupFile {
  return {
    app: APP,
    version: BACKUP_VERSION,
    createdAt: input.now,
    appVersion: input.appVersion,
    sync: input.sync,
    local: input.local,
  }
}

/** С отступами: файл кладут в облако и иногда открывают глазами */
export function serializeBackup(file: BackupFile): string {
  return JSON.stringify(file, null, 2)
}

export function backupFileName(now: number): string {
  return `erudit-backup-${new Date(now).toISOString().slice(0, 10)}.json`
}

function isSnapshot(value: unknown): value is StorageSnapshot {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Ошибки уходят кодом, а не текстом: локали этому модулю недоступны.
 * Разбираем строго — импорт перезаписывает настройки, и чужой JSON тут навредит.
 */
export function parseBackup(text: string): BackupFile {
  let parsed: unknown

  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('backup-broken')
  }

  if (!isSnapshot(parsed) || parsed.app !== APP) throw new Error('backup-foreign')

  const { version, sync, local } = parsed
  if (typeof version !== 'number' || version > BACKUP_VERSION) throw new Error('backup-newer')
  if (!isSnapshot(sync) || !isSnapshot(local)) throw new Error('backup-broken')

  return {
    app: APP,
    version,
    createdAt: typeof parsed.createdAt === 'number' ? parsed.createdAt : 0,
    appVersion: typeof parsed.appVersion === 'string' ? parsed.appVersion : '',
    sync,
    local,
  }
}

/** Сколько живых слов приехало — надгробия удалённых в счёт не идут */
export function backupWordCount(file: BackupFile): number {
  const entries = file.local[DICTIONARY_KEY]
  if (!Array.isArray(entries)) return 0

  return entries.filter((entry) => isSnapshot(entry) && !entry.deletedAt).length
}
