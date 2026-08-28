<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import InlineSvg from '@/components/InlineSvg.vue'
import doneArt from '@/assets/illustrations/training-done.svg?raw'
import scheduleArt from '@/assets/illustrations/training-schedule.svg?raw'
import TrainingProgressRing from './TrainingProgressRing.vue'
import { SESSION_SIZE, countProgress, dueEntries, nextDueAt } from '@/utils/srs'
import type { DictionaryProgress } from '@/utils/srs'
import type { DictionaryEntry } from '@/types/words'

/** Экран до начала пачки: сколько слов на какой стадии и что тренировать сегодня */
const props = defineProps<{ entries: DictionaryEntry[] }>()

const emit = defineEmits<{ start: [] }>()

// стадии заданы одним списком: он же задаёт порядок дуг в кольце и строк в легенде.
// классы прописаны целиком — из склеенных имён Tailwind ничего не собирает. `brand`
// в цвета стадий не годится: в этой теме это тот же янтарь, что и у «новых»
const STAGES: { key: keyof DictionaryProgress; labelKey: string; stroke: string; dot: string }[] = [
  { key: 'learned', labelKey: 'training.learned', stroke: 'stroke-mark-saved', dot: 'bg-mark-saved' },
  { key: 'learning', labelKey: 'training.learning', stroke: 'stroke-learning', dot: 'bg-learning' },
  { key: 'fresh', labelKey: 'training.fresh', stroke: 'stroke-mark-new', dot: 'bg-mark-new' },
]

// composables
const { t, locale } = useI18n()

// computed
const progress = computed<DictionaryProgress>(() => countProgress(props.entries))
const total = computed<number>(
  () => progress.value.fresh + progress.value.learning + progress.value.learned,
)
const dueCount = computed<number>(() => dueEntries(props.entries, Date.now()).length)
const sessionSize = computed<number>(() => Math.min(dueCount.value, SESSION_SIZE))
const sessionLabel = computed<string>(
  () => t('common.words', { count: sessionSize.value }, sessionSize.value),
)
const nextDueLabel = computed<string>(() => {
  const timestamp = nextDueAt(props.entries, Date.now())

  return timestamp
    ? new Date(timestamp).toLocaleDateString(locale.value, { day: 'numeric', month: 'long' })
    : ''
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-wrap items-center gap-x-10 gap-y-6">
      <div class="relative size-36 shrink-0">
        <TrainingProgressRing
          :progress="progress"
          :stages="STAGES"
        />

        <!-- в дырке кольца — сумма его же долей, поэтому подпись только про словарь -->
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <span class="text-3xl font-semibold tabular-nums">{{ total }}</span>
          <span class="text-xs text-muted">{{ t('training.total') }}</span>
        </div>
      </div>

      <dl class="m-0 flex flex-col gap-3">
        <div
          v-for="stage in STAGES"
          :key="stage.key"
          class="flex items-center gap-3"
        >
          <span
            class="size-2.5 shrink-0 rounded-full"
            :class="stage.dot"
            aria-hidden="true"
          />
          <dt class="min-w-28 text-muted">{{ t(stage.labelKey) }}</dt>
          <dd class="m-0 text-lg font-medium tabular-nums">{{ progress[stage.key] }}</dd>
        </div>
      </dl>

      <!-- та же тройка цветов, что и в кольце: янтарное новое доезжает до зелёного -->
      <InlineSvg
        :markup="scheduleArt"
        class="ml-auto hidden w-72 text-content lg:block"
      />
    </div>

    <div
      v-if="dueCount"
      class="flex flex-col items-start gap-2"
    >
      <!-- фокус на кнопке: пачка начинается с Enter, как и продолжается на итоге -->
      <Button
        autofocus
        :label="t('training.start', { words: sessionLabel })"
        @click="emit('start')"
      />

      <!-- пачка ограничена, и без этой строки кажется, что к повторению только двадцать -->
      <p
        v-if="dueCount > sessionSize"
        class="m-0 text-xs text-muted"
      >
        {{ t('training.dueTotal', { count: dueCount }) }}
      </p>
    </div>

    <div
      v-else
      class="flex flex-col items-center gap-4 py-2 text-center"
    >
      <InlineSvg
        :markup="doneArt"
        class="w-40 text-content"
      />
      <p class="m-0 max-w-sm text-muted">
        {{ t('training.allDone') }}
        <template v-if="nextDueLabel">{{ t('training.nextDue', { date: nextDueLabel }) }}</template>
      </p>
    </div>
  </div>
</template>
