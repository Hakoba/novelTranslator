import { computed, type ComputedRef } from 'vue'
import { useBrowserLocalStorage } from './useBrowserStorage'
import type { DictionaryEntry } from '@/types/words'
import { DICTIONARY_KEY, normalizeTerm } from '@/utils/dictionary'

/**
 * Единственная точка доступа к словарю: компоненты в `storage` не ходят.
 * Когда появится серверный словарь, здесь меняется реализация, а UI — нет.
 *
 * Хранилище — `local`, а не `sync`: у `sync` лимит 100 КБ на всё и 8 КБ на запись,
 * пара сотен слов с контекстом туда не влезает. Плата — словарь живёт
 * только в этом браузере (см. `deferred.md`).
 */

export type NewDictionaryEntry = Omit<
  DictionaryEntry,
  'id' | 'addedAt' | 'updatedAt' | 'deletedAt'
>

const { data, promise } = useBrowserLocalStorage<DictionaryEntry[]>(DICTIONARY_KEY, [])

function createId(): string {
  // randomUUID работает только в secure context — на http-странице content script падал бы
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** Ищет в том числе среди надгробий: повторное добавление воскрешает запись */
function findRecord(original: string): DictionaryEntry | undefined {
  const key = normalizeTerm(original)

  return data.value.find((entry) => normalizeTerm(entry.original) === key)
}

export function useDictionary(): {
  entries: ComputedRef<DictionaryEntry[]>
  deletedEntries: ComputedRef<DictionaryEntry[]>
  promise: Promise<unknown>
  hasEntry: (original: string) => boolean
  addEntry: (input: NewDictionaryEntry) => DictionaryEntry
  updateEntry: (id: string, patch: Partial<NewDictionaryEntry>) => void
  removeEntry: (id: string) => void
  restoreEntry: (id: string) => void
  purgeDeleted: () => void
} {
  // computed
  const entries = computed<DictionaryEntry[]>(() =>
    data.value.filter((entry) => !entry.deletedAt),
  )
  // свежеудалённые сверху: возвращают обычно то, что убрали только что
  const deletedEntries = computed<DictionaryEntry[]>(() =>
    data.value
      .filter((entry) => entry.deletedAt)
      .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0)),
  )

  // методы
  function hasEntry(original: string): boolean {
    const existing = findRecord(original)

    return Boolean(existing && !existing.deletedAt)
  }

  function addEntry(input: NewDictionaryEntry): DictionaryEntry {
    const now = Date.now()
    const existing = findRecord(input.original)

    if (existing) {
      // не затираем уже собранное: пояснение могло прийти позже перевода
      Object.assign(existing, {
        translate: input.translate || existing.translate,
        context: input.context ?? existing.context,
        explanation: input.explanation ?? existing.explanation,
        level: input.level ?? existing.level,
        updatedAt: now,
        deletedAt: undefined,
      })

      return existing
    }

    const entry: DictionaryEntry = { ...input, id: createId(), addedAt: now, updatedAt: now }
    data.value.push(entry)

    return entry
  }

  function updateEntry(id: string, patch: Partial<NewDictionaryEntry>): void {
    const entry = data.value.find((item) => item.id === id)
    if (!entry) return

    Object.assign(entry, patch, { updatedAt: Date.now() })
  }

  /** Мягкое удаление: без надгробия удаление не доедет до других устройств */
  function removeEntry(id: string): void {
    const entry = data.value.find((item) => item.id === id)
    if (!entry) return

    const now = Date.now()
    entry.deletedAt = now
    entry.updatedAt = now
  }

  /** Прогресс тренировки надгробие хранит вместе со словом — возвращается и он */
  function restoreEntry(id: string): void {
    const entry = data.value.find((item) => item.id === id)
    if (!entry) return

    entry.deletedAt = undefined
    entry.updatedAt = Date.now()
  }

  /**
   * Выбросить надгробия совсем. Пока словарь живёт только в этом браузере, это
   * безопасно; с появлением синхронизации чистить придётся с оглядкой на другие
   * устройства — они вернут слово, если не увидят отметку об удалении.
   */
  function purgeDeleted(): void {
    data.value = data.value.filter((entry) => !entry.deletedAt)
  }

  return {
    entries,
    deletedEntries,
    promise,
    hasEntry,
    addEntry,
    updateEntry,
    removeEntry,
    restoreEntry,
    purgeDeleted,
  }
}
