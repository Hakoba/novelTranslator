<script setup lang="ts">
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
      {{ displayName }} обновлён
    </template>
    <template #subtitle>
      Версия {{ version }}
    </template>
    <template #content>
      <div class="pt-2">
        <Button
          label="Открыть настройки"
          @click="openOptions"
        />
      </div>
    </template>
  </Card>
</template>
