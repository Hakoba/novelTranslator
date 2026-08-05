<script setup lang="ts">
import { ChevronDown, ChevronUp, X } from 'lucide-vue-next'
import Badge from 'primevue/badge'
import Button from 'primevue/button'

defineProps<{
  isMinimized: boolean
  wordsCount: number
  isLoading: boolean
}>()

const emit = defineEmits<{
  (e: 'toggleMinimized'): void
  (e: 'close'): void
}>()
</script>

<template>
  <div class="flex w-full items-center gap-2">
    <strong
      class="flex-1"
      role="heading"
      aria-level="2"
    >
      Сложные слова и фразы
    </strong>

    <Badge
      v-if="!isLoading && wordsCount"
      :value="String(wordsCount)"
      severity="info"
      aria-label="Найдено слов"
    />

    <Button
      text
      rounded
      severity="secondary"
      size="small"
      :aria-label="isMinimized ? 'Развернуть' : 'Свернуть'"
      @click="emit('toggleMinimized')"
    >
      <ChevronDown
        v-if="isMinimized"
        :size="16"
      />
      <ChevronUp
        v-else
        :size="16"
      />
    </Button>

    <Button
      text
      rounded
      severity="secondary"
      size="small"
      aria-label="Закрыть"
      @click="emit('close')"
    >
      <X :size="16" />
    </Button>
  </div>
</template>
