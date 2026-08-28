<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { DatabaseBackup, Download, RotateCw, Upload } from 'lucide-vue-next'
import AppLoader from '@/components/AppLoader.vue'
import InlineSvg from '@/components/InlineSvg.vue'
import backupArt from '@/assets/illustrations/backup.svg?raw'
import {
  backupFileName,
  backupWordCount,
  buildBackup,
  parseBackup,
  serializeBackup,
} from '@/utils/backup'
import { downloadFile } from '@/utils/download'

const { t } = useI18n()

// state
const isExporting = ref<boolean>(false)
const importState = ref<{ busy: boolean; message: string; failed: boolean; done: boolean }>({
  busy: false,
  message: '',
  failed: false,
  done: false,
})
const $file = ref<HTMLInputElement | undefined>(undefined)

// методы
/** Снимаем оба хранилища целиком: перечислять ключи руками — забывать новые */
async function exportBackup(): Promise<void> {
  if (isExporting.value) return

  isExporting.value = true

  try {
    const [sync, local] = await Promise.all([
      browser.storage.sync.get(),
      browser.storage.local.get(),
    ])
    const file = buildBackup({ sync, local, appVersion: __VERSION__, now: Date.now() })

    downloadFile(serializeBackup(file), backupFileName(file.createdAt), 'application/json')
  } finally {
    isExporting.value = false
  }
}

function reloadPage(): void {
  location.reload()
}

/** Разбор копии приходит кодом: `backup.ts` тестируется в node и локалей не знает */
function importErrorMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : ''
  const known: Record<string, string> = {
    'backup-broken': 'errors.backupBroken',
    'backup-foreign': 'errors.backupForeign',
    'backup-newer': 'errors.backupNewer',
  }

  return known[code] ? t(known[code]) : t('errors.backupFailed')
}

/**
 * Записываем поверх: ключей, которых в копии нет, `set` не трогает. Страницу
 * после этого перезагружает пользователь — открытые формы читают storage один раз
 * на старте и мержат с дефолтами, а на лету приходит голое значение из копии.
 */
async function importBackup(event: Event): Promise<void> {
  const input = event.target
  if (!(input instanceof HTMLInputElement)) return

  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  importState.value = { busy: true, message: '', failed: false, done: false }

  try {
    const backup = parseBackup(await file.text())

    await browser.storage.sync.set(backup.sync)
    await browser.storage.local.set(backup.local)

    importState.value = {
      busy: false,
      failed: false,
      done: true,
      message: t('backup.imported', { words: backupWordCount(backup) }),
    }
  } catch (error) {
    importState.value = {
      busy: false,
      failed: true,
      done: false,
      message: importErrorMessage(error),
    }
  }
}
</script>

<template>
  <Card>
    <template #title>
      <div class="flex items-center justify-between gap-4">
        <span class="flex items-center gap-2">
          <DatabaseBackup :size="20" />
          {{ t('backup.title') }}
        </span>
        <InlineSvg
          :markup="backupArt"
          class="w-24 text-content"
        />
      </div>
    </template>
    <template #subtitle>
      {{ t('backup.subtitle') }}
    </template>
    <template #content>
      <div class="flex flex-col gap-4 pt-2">
        <Message
          v-if="importState.message"
          :severity="importState.failed ? 'error' : 'success'"
          :closable="false"
        >
          <div class="flex flex-wrap items-center gap-3">
            <span>{{ importState.message }}</span>
            <Button
              v-if="importState.done"
              size="small"
              severity="secondary"
              :label="t('backup.reload')"
              @click="reloadPage"
            >
              <template #icon>
                <RotateCw :size="16" />
              </template>
            </Button>
          </div>
        </Message>

        <div class="flex flex-col gap-2 border-t border-line pt-4">
          <div class="flex flex-wrap gap-2">
            <Button
              :disabled="isExporting"
              :label="isExporting ? t('backup.exportBusy') : t('backup.export')"
              @click="exportBackup"
            >
              <template #icon>
                <AppLoader
                  v-if="isExporting"
                  :size="16"
                />
                <Download
                  v-else
                  :size="16"
                />
              </template>
            </Button>
            <Button
              severity="secondary"
              outlined
              :disabled="importState.busy"
              :label="importState.busy ? t('backup.importBusy') : t('backup.import')"
              @click="$file?.click()"
            >
              <template #icon>
                <AppLoader
                  v-if="importState.busy"
                  :size="16"
                />
                <Upload
                  v-else
                  :size="16"
                />
              </template>
            </Button>
            <input
              ref="$file"
              type="file"
              accept="application/json,.json"
              class="hidden"
              @change="importBackup"
            >
          </div>
          <small class="text-muted">{{ t('backup.exportHint') }}</small>
          <small class="text-muted">{{ t('backup.importHint') }}</small>
        </div>

        <Message
          severity="warn"
          size="small"
          variant="simple"
        >
          {{ t('backup.keysWarning') }}
        </Message>
      </div>
    </template>
  </Card>
</template>
