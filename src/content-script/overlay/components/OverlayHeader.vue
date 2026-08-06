<script setup lang="ts">
import { ChevronDown, ChevronUp, Eraser, SquareDashedMousePointer, X } from 'lucide-vue-next'
import Badge from 'primevue/badge'
import Button from 'primevue/button'
import { useI18n } from 'vue-i18n'

defineProps<{
  isMinimized: boolean
  wordsCount: number
  isLoading: boolean
  isPicking: boolean
  hasArea: boolean
}>()

const { t } = useI18n()

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
      {{ t('overlay.title') }}
    </strong>

    <Badge
      v-if="!isLoading && wordsCount"
      :value="String(wordsCount)"
      severity="info"
      :aria-label="t('overlay.wordsFound')"
    />

    <Button
      v-if="hasArea && !isPicking"
      text
      rounded
      severity="secondary"
      size="small"
      :aria-label="t('overlay.resetArea')"
      :data-hint="t('overlay.resetAreaHint')"
      @click="emit('resetArea')"
    >
      <Eraser :size="16" />
    </Button>

    <Button
      text
      rounded
      :severity="isPicking ? 'primary' : 'secondary'"
      size="small"
      :aria-label="t(isPicking ? 'overlay.pickAreaCancel' : 'overlay.pickArea')"
      :data-hint="t(isPicking ? 'overlay.pickAreaCancelHint' : 'overlay.pickAreaHint')"
      @click="emit('pickArea')"
    >
      <SquareDashedMousePointer :size="16" />
    </Button>

    <Button
      text
      rounded
      severity="secondary"
      size="small"
      :aria-label="t(isMinimized ? 'overlay.expand' : 'overlay.collapse')"
      :data-hint="t(isMinimized ? 'overlay.expandHint' : 'overlay.collapseHint')"
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
      :aria-label="t('overlay.close')"
      :data-hint="t('overlay.closeHint')"
      @click="emit('close')"
    >
      <X :size="16" />
    </Button>
  </div>
</template>
