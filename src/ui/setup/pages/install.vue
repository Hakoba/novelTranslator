<script setup lang="ts">
import AccessSites from '@/components/accessSites.vue'

const displayName = __DISPLAY_NAME__

// методы
function openOptions(): void {
  browser.runtime.openOptionsPage()
}
</script>

<template>
  <Card>
    <template #title>
      {{ displayName }} установлен
    </template>
    <template #subtitle>
      Осталось проверить, на каких сайтах он работает, и указать адрес своей модели
    </template>
    <template #content>
      <div class="flex flex-col gap-4 pt-2">
        <AccessSites />

        <div>
          <Button
            label="Открыть настройки"
            @click="openOptions"
          />
        </div>
      </div>
    </template>
  </Card>
</template>
