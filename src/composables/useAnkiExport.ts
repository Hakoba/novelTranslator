import { ref, type Ref } from 'vue'
// путь до wasm даёт сборщик: в расширении относительные пути sql.js не находит
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import type { DictionaryEntry } from '@/types/words'
import { buildApkg } from '@/utils/anki'
import { downloadFile } from '@/utils/download'

function fileName(now: number): string {
  const date = new Date(now).toISOString().slice(0, 10)

  return `erudit-${date}.apkg`
}

export function useAnkiExport(): {
  isExporting: Ref<boolean>
  exportError: Ref<string>
  exportToAnki: (entries: DictionaryEntry[]) => Promise<void>
} {
  // state
  const isExporting = ref<boolean>(false)
  const exportError = ref<string>('')

  // методы
  async function exportToAnki(entries: DictionaryEntry[]): Promise<void> {
    if (!entries.length || isExporting.value) return

    isExporting.value = true
    exportError.value = ''

    try {
      const now = Date.now()
      const apkg = await buildApkg(entries, { locateFile: () => sqlWasmUrl, now })
      downloadFile(apkg, fileName(now))
    } catch (error) {
      exportError.value = error instanceof Error
        ? `Не удалось собрать колоду: ${error.message}`
        : 'Не удалось собрать колоду'
    } finally {
      isExporting.value = false
    }
  }

  return { isExporting, exportError, exportToAnki }
}
