<script setup lang="ts">
import { computed } from 'vue'
import { Settings } from 'lucide-vue-next'
import AccessSites from '@/components/accessSites.vue'
import { useAccessSites } from '@/composables/useAccessSites'

const { enabledSites } = useAccessSites()

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

    <AccessSites />
  </div>
</template>
