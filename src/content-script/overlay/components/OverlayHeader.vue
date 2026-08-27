<script setup lang="ts">
import { BookMarked, Eraser, PanelRightClose, RefreshCw, Replace, SquareDashedMousePointer, X } from 'lucide-vue-next'
import Badge from 'primevue/badge'
import Button from 'primevue/button'
import { useI18n } from 'vue-i18n'
import AppLogo from '@/components/AppLogo.vue'
import { openDictionaryTab } from '@/utils/dictionaryTab'

defineProps<{
  wordsCount: number
  isLoading: boolean
  isPicking: boolean
  hasArea: boolean
  /** Разбор уже запускали: до первого раза перечитывать нечего, там своя кнопка */
  isStarted: boolean
  /** Настройка вкраплений включена: кнопка её дублирует */
  isImmersion: boolean
}>()

const { t } = useI18n()

const emit = defineEmits<{
  (e: 'collapse'): void
  (e: 'pickArea'): void
  (e: 'resetArea'): void
  (e: 'reread'): void
  (e: 'toggleImmersion'): void
  (e: 'close'): void
}>()
</script>

<template>
  <div class="flex w-full items-center gap-2">
    <AppLogo :size="18" />

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
      v-if="isStarted && !isLoading"
      text
      rounded
      severity="secondary"
      size="small"
      :aria-label="t('overlay.reread')"
      :data-hint="t('overlay.rereadHint')"
      @click="emit('reread')"
    >
      <RefreshCw :size="16" />
    </Button>

    <Button
      text
      rounded
      severity="secondary"
      size="small"
      :aria-label="t('overlay.dictionary')"
      :data-hint="t('overlay.dictionaryHint')"
      @click="openDictionaryTab"
    >
      <BookMarked :size="16" />
    </Button>

    <Button
      text
      rounded
      :severity="isImmersion ? 'primary' : 'secondary'"
      size="small"
      :aria-label="t('overlay.immersion')"
      :data-hint="t('overlay.immersionHint')"
      @click="emit('toggleImmersion')"
    >
      <Replace :size="16" />
    </Button>

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
      :aria-label="t('overlay.collapse')"
      :data-hint="t('overlay.collapseHint')"
      @click="emit('collapse')"
    >
      <PanelRightClose :size="16" />
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
