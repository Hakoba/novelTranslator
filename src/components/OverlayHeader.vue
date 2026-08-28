<script setup lang="ts">
import { BookMarked, Eraser, PanelRightClose, RefreshCw, Replace, Settings, SquareDashedMousePointer, X } from 'lucide-vue-next'
import Badge from 'primevue/badge'
import Button from 'primevue/button'
import { useI18n } from 'vue-i18n'
import AppLogo from '@/components/AppLogo.vue'
import { openDictionaryTab, openOptionsTab } from '@/utils/dictionaryTab'
import { hintAttrs } from '@/utils/hint'

defineProps<{
  wordsCount: number
  isLoading: boolean
  isPicking: boolean
  hasArea: boolean
  /** Разбор уже запускали: до первого раза перечитывать нечего, там своя кнопка */
  isStarted: boolean
  /** Настройка вкраплений включена: кнопка её дублирует */
  isImmersion: boolean
  /** Док в странице: свернуть и закрыть можно только его, у боковой панели браузера свой крестик */
  isDocked?: boolean
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
  <!-- перенос строк: в узкой боковой панели кнопки иначе уезжают за край -->
  <div class="flex w-full flex-wrap items-center gap-2">
    <!-- в боковой панели имя и значок расширения рисует сам браузер — свои не повторяем,
         иначе в узкой панели на них уходит вся ширина и заголовок всё равно обрезается -->
    <template v-if="isDocked">
      <AppLogo :size="18" />

      <strong
        class="flex-1 truncate"
        role="heading"
        aria-level="2"
      >
        {{ t('overlay.title') }}
      </strong>
    </template>

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
      v-bind="hintAttrs(t('overlay.rereadHint'))"
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
      v-bind="hintAttrs(t('overlay.dictionaryHint'))"
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
      v-bind="hintAttrs(t('overlay.immersionHint'))"
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
      v-bind="hintAttrs(t('overlay.resetAreaHint'))"
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
      v-bind="hintAttrs(t(isPicking ? 'overlay.pickAreaCancelHint' : 'overlay.pickAreaHint'))"
      @click="emit('pickArea')"
    >
      <SquareDashedMousePointer :size="16" />
    </Button>

    <Button
      text
      rounded
      severity="secondary"
      size="small"
      :aria-label="t('nav.settings')"
      v-bind="hintAttrs(t('overlay.settingsHint'))"
      @click="openOptionsTab"
    >
      <Settings :size="16" />
    </Button>

    <Button
      v-if="isDocked"
      text
      rounded
      severity="secondary"
      size="small"
      :aria-label="t('overlay.collapse')"
      v-bind="hintAttrs(t('overlay.collapseHint'))"
      @click="emit('collapse')"
    >
      <PanelRightClose :size="16" />
    </Button>

    <Button
      v-if="isDocked"
      text
      rounded
      severity="secondary"
      size="small"
      :aria-label="t('overlay.close')"
      v-bind="hintAttrs(t('overlay.closeHint'))"
      @click="emit('close')"
    >
      <X :size="16" />
    </Button>
  </div>
</template>
