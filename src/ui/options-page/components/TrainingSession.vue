<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, X } from 'lucide-vue-next'
import { useDictionary } from '@/composables/useDictionary'
import { reviewEntry } from '@/utils/srs'
import type { DictionaryEntry } from '@/types/words'

/** Пачка карточек: показ перевода, оценка и учёт ответов. Итог уходит наверх одним событием */
const props = defineProps<{ queue: DictionaryEntry[] }>()

const emit = defineEmits<{ finish: [result: { known: number; unknown: number }] }>()

// composables
const { t } = useI18n()
const { updateEntry } = useDictionary()

// state
const currentIndex = ref<number>(0)
const isAnswerVisible = ref<boolean>(false)
const knownCount = ref<number>(0)
const unknownCount = ref<number>(0)

// computed
const current = computed<DictionaryEntry | undefined>(() => props.queue[currentIndex.value])
const progressLabel = computed<string>(() =>
  t('training.progress', {
    current: Math.min(currentIndex.value + 1, props.queue.length),
    total: props.queue.length,
  }),
)
/** Ширина полосы: доля уже отвеченных карточек, а не текущий номер */
const progressWidth = computed<string>(() =>
  props.queue.length ? `${(currentIndex.value / props.queue.length) * 100}%` : '0%',
)

// методы
function answer(isKnown: boolean): void {
  const entry = current.value
  if (!entry) return

  updateEntry(entry.id, reviewEntry(entry, isKnown, Date.now()))

  if (isKnown) knownCount.value += 1
  else unknownCount.value += 1

  isAnswerVisible.value = false
  currentIndex.value += 1

  if (!current.value) {
    emit('finish', { known: knownCount.value, unknown: unknownCount.value })
  }
}

/** Пробел показывает перевод, 1/2 — оценка */
function onKeyDown(event: KeyboardEvent): void {
  if (event.metaKey || event.ctrlKey || event.altKey || !current.value) return

  if (!isAnswerVisible.value) {
    if (event.key !== ' ' && event.key !== 'Enter') return

    // иначе пробел заодно нажмёт сфокусированную кнопку и пролистает карточку
    event.preventDefault()
    isAnswerVisible.value = true

    return
  }

  if (event.key === '1') answer(false)
  else if (event.key === '2') answer(true)
  else if (event.key === ' ' || event.key === 'Enter') event.preventDefault()
}

// lifecycle
onMounted((): void => {
  window.addEventListener('keydown', onKeyDown)
})

onUnmounted((): void => {
  window.removeEventListener('keydown', onKeyDown)
})
</script>

<template>
  <div
    v-if="current"
    class="flex flex-col gap-4"
  >
    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between gap-4 text-sm text-muted">
        <span class="tabular-nums">{{ progressLabel }}</span>
        <span class="flex items-center gap-3 tabular-nums">
          <span class="flex items-center gap-1">
            <Check
              :size="14"
              class="text-mark-saved"
            />
            {{ knownCount }}
          </span>
          <span class="flex items-center gap-1">
            <X
              :size="14"
              class="text-mark-new"
            />
            {{ unknownCount }}
          </span>
        </span>
      </div>
      <div class="h-1 overflow-hidden rounded-full bg-surface-hover">
        <div
          class="h-full rounded-full bg-brand transition-[width] duration-300"
          :style="{ width: progressWidth }"
        />
      </div>
    </div>

    <!-- высота задана снизу: без неё карточка подпрыгивает, когда открывается перевод -->
    <div
      class="relative flex min-h-60 flex-col items-center justify-center gap-4 rounded-2xl
             border border-line bg-surface-hover p-8 text-center"
    >
      <span
        v-if="current.level"
        class="absolute top-4 right-4 rounded bg-surface px-1.5 py-0.5 font-mono text-[11px] text-muted"
      >
        {{ current.level }}
      </span>

      <p class="m-0 text-3xl font-semibold">
        {{ current.original }}
      </p>

      <p
        v-if="current.context"
        class="m-0 max-w-lg text-muted italic"
      >
        «{{ current.context }}»
      </p>

      <template v-if="isAnswerVisible">
        <div class="h-px w-16 bg-line" />
        <p class="m-0 text-xl">
          {{ current.translate }}
        </p>
        <p
          v-if="current.explanation"
          class="m-0 max-w-lg text-sm text-muted"
        >
          {{ current.explanation }}
        </p>
      </template>
    </div>

    <div class="flex justify-center gap-2">
      <Button
        v-if="!isAnswerVisible"
        :label="t('training.showAnswer')"
        @click="isAnswerVisible = true"
      />

      <template v-else>
        <Button
          severity="danger"
          outlined
          :label="t('training.unknown')"
          @click="answer(false)"
        >
          <template #icon>
            <X :size="16" />
          </template>
        </Button>
        <Button
          severity="success"
          :label="t('training.known')"
          @click="answer(true)"
        >
          <template #icon>
            <Check :size="16" />
          </template>
        </Button>
      </template>
    </div>

    <p class="m-0 text-center">
      <span class="rounded-full bg-surface-hover px-3 py-1 text-xs text-muted">
        {{ t(isAnswerVisible ? 'training.keysAnswer' : 'training.keysShow') }}
      </span>
    </p>
  </div>
</template>
