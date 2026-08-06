<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { BookMarked, Settings } from 'lucide-vue-next'
import AccessSites from '@/components/accessSites.vue'
import { useAccessSites } from '@/composables/useAccessSites'
import { useDictionary } from '@/composables/useDictionary'

const { t } = useI18n()
const { enabledSites } = useAccessSites()
const { entries } = useDictionary()

// computed
const summary = computed<string>(() => {
  const count = enabledSites.value.length

  return count ? t('popup.active', { count }, count) : t('popup.inactive')
})

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
        :aria-label="t('nav.settings')"
        @click="openOptions"
      >
        <Settings :size="18" />
      </Button>
    </div>

    <Button
      severity="secondary"
      outlined
      size="small"
      :label="entries.length ? t('popup.dictionary', { count: entries.length }) : t('popup.dictionaryEmpty')"
      @click="openDictionary"
    >
      <template #icon>
        <BookMarked :size="16" />
      </template>
    </Button>

    <AccessSites />
  </div>
</template>
