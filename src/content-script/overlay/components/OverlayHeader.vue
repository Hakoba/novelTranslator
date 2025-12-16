<script setup lang="ts">
import { defineEmits, defineProps } from 'vue'
import Button from 'primevue/button'
import Badge from 'primevue/badge'

const props = defineProps<{
  isPinned: boolean
  isMinimized: boolean
  wordsCount: number
  isLoading: boolean
}>()

const emit = defineEmits<{
  (e: 'togglePinned'): void
  (e: 'toggleMinimized'): void
  (e: 'close'): void
}>()

function handleToggleMinimized(): void {
  emit('toggleMinimized')
}
function handleTogglePinned(): void {
  emit('togglePinned')
}
function handleClose(): void {
  emit('close')
}
</script>

<template>
  <div @click="handleToggleMinimized" role="heading" aria-level="2">
    <div>
      <strong>Сложные слова и фразы (B1+)</strong>
      <Badge v-if="!props.isLoading && props.wordsCount" :value="String(props.wordsCount)" severity="info" aria-label="Количество слов" />
    </div>
    <div>
      <Button type="button" text rounded severity="secondary" aria-label="Закрыть" title="Закрыть" @click.stop="handleClose">
      </Button>
    </div>
  </div>
</template>
