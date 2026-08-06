<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const displayName = __DISPLAY_NAME__
const version = __VERSION__

// методы
function openOptions(): void {
  browser.runtime.openOptionsPage()
}
</script>

<template>
  <Card>
    <template #title>
      {{ t('setup.updated', { name: displayName }) }}
    </template>
    <template #subtitle>
      {{ t('setup.version', { version }) }}
    </template>
    <template #content>
      <div class="pt-2">
        <Button
          :label="t('common.openSettings')"
          @click="openOptions"
        />
      </div>
    </template>
  </Card>
</template>
