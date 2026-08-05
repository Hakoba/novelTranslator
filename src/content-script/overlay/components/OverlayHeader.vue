<script setup lang="ts">
import { ChevronDown, ChevronUp, Eraser, SquareDashedMousePointer, X } from 'lucide-vue-next'
import Badge from 'primevue/badge'
import Button from 'primevue/button'

defineProps<{
  isMinimized: boolean
  wordsCount: number
  isLoading: boolean
  isPicking: boolean
  hasArea: boolean
}>()

const emit = defineEmits<{
  (e: 'toggleMinimized'): void
  (e: 'pickArea'): void
  (e: 'resetArea'): void
  (e: 'close'): void
}>()
</script>

<template>
  <div class="flex w-full items-center gap-2">
    <strong
      class="flex-1 truncate"
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
      v-if="hasArea && !isPicking"
      text
      rounded
      severity="secondary"
      size="small"
      aria-label="Забыть выбранную область"
      data-hint="Забыть выбранный блок"
      @click="emit('resetArea')"
    >
      <Eraser :size="16" />
    </Button>

    <Button
      text
      rounded
      :severity="isPicking ? 'primary' : 'secondary'"
      size="small"
      :aria-label="isPicking ? 'Отменить выбор области' : 'Выбрать область с текстом'"
      :data-hint="isPicking
        ? 'Кликните по блоку, Esc — отмена'
        : 'Выбрать блок с текстом'"
      @click="emit('pickArea')"
    >
      <SquareDashedMousePointer :size="16" />
    </Button>

    <Button
      text
      rounded
      severity="secondary"
      size="small"
      :aria-label="isMinimized ? 'Развернуть' : 'Свернуть'"
      :data-hint="isMinimized ? 'Развернуть панель' : 'Свернуть панель'"
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
      data-hint="Закрыть до перезагрузки"
      @click="emit('close')"
    >
      <X :size="16" />
    </Button>
  </div>
</template>
