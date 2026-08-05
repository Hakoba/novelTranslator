<script setup lang="ts">
import { computed } from 'vue'
import { BookMarked, Settings } from 'lucide-vue-next'
import AccessSites from '@/components/accessSites.vue'
import { useAccessSites } from '@/composables/useAccessSites'
import { useDictionary } from '@/composables/useDictionary'

const { enabledSites } = useAccessSites()
const { entries } = useDictionary()

// computed
const summary = computed<string>(() =>
  enabledSites.value.length
    ? `Активен на ${enabledSites.value.length} сайт(ах)`
    : 'Нет активных сайтов',
)

// методы
function openOptions(): void {
  browser.runtime.openOptionsPage()
}

function openDictionary(): void {
  browser.tabs.create({
    url: browser.runtime.getURL(
      'src/ui/options-page/index.html?route=/options-page/dictionary',
    ),
  })
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between gap-2">
      <span class="text-muted">{{ summary }}</span>
      <Button
        severity="secondary"
        text
        rounded
        aria-label="Настройки"
        @click="openOptions"
      >
        <Settings :size="18" />
      </Button>
    </div>

    <Button
      severity="secondary"
      outlined
      size="small"
      :label="entries.length ? `Словарь · ${entries.length}` : 'Словарь пуст'"
      @click="openDictionary"
    >
      <template #icon>
        <BookMarked :size="16" />
      </template>
    </Button>

    <AccessSites />
  </div>
</template>
