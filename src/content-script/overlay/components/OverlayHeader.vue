<script setup lang="ts">
import { defineEmits, defineProps } from 'vue'
import Button from 'primevue/button'

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
  <header class="nt-header" @click="handleToggleMinimized">
    <div class="nt-header-left">
      <span class="nt-header-icon" aria-hidden="true">📘</span>
      <strong class="nt-title">Сложные слова и фразы (B1+)</strong>
      <span v-if="!props.isLoading && props.wordsCount" class="nt-badge" aria-label="Количество слов">{{ props.wordsCount }}</span>
    </div>
    <div class="nt-header-actions">
      <Button type="button" text rounded severity="secondary" :aria-label="props.isPinned ? 'Открепить' : 'Закрепить'" title="Закрепить" @click.stop="handleTogglePinned">
        <span aria-hidden="true">{{ props.isPinned ? '📌' : '📍' }}</span>
      </Button>
      <Button type="button" text rounded severity="secondary" aria-label="Закрыть" title="Закрыть" @click.stop="handleClose">
        <span aria-hidden="true">✖️</span>
      </Button>
    </div>
  </header>
</template>
