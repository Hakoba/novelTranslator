<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AccessSites from '@/components/accessSites.vue'

const { t } = useI18n()

const displayName = __DISPLAY_NAME__

// методы
function openOptions(): void {
  browser.runtime.openOptionsPage()
}
</script>

<template>
  <Card>
    <template #title>
      {{ t('setup.installed', { name: displayName }) }}
    </template>
    <template #subtitle>
      {{ t('setup.installedSubtitle') }}
    </template>
    <template #content>
      <div class="flex flex-col gap-4 pt-2">
        <AccessSites />

        <div>
          <Button
            :label="t('common.openSettings')"
            @click="openOptions"
          />
        </div>
      </div>
    </template>
  </Card>
</template>
