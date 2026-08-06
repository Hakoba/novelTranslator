<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, X } from 'lucide-vue-next'
import { useDictionary } from '@/composables/useDictionary'
import { countNew, dueEntries, nextDueAt, reviewEntry } from '@/utils/srs'
import type { DictionaryEntry } from '@/types/words'

/** Больше за раз всё равно не удержать, а очередь может накопиться в сотни слов */
const SESSION_SIZE = 20

// composables
const { t, locale } = useI18n()
const { entries, updateEntry } = useDictionary()

// state
const queue = ref<DictionaryEntry[]>([])
const currentIndex = ref<number>(0)
const isAnswerVisible = ref<boolean>(false)
const isSessionActive = ref<boolean>(false)
const knownCount = ref<number>(0)
const unknownCount = ref<number>(0)

// computed
const dueCount = computed<number>(() => dueEntries(entries.value, Date.now()).length)
const newCount = computed<number>(() => countNew(entries.value))
const current = computed<DictionaryEntry | undefined>(() => queue.value[currentIndex.value])
const isFinished = computed<boolean>(() => isSessionActive.value && !current.value)
const progressLabel = computed<string>(() =>
  t('training.progress', {
    current: Math.min(currentIndex.value + 1, queue.value.length),
    total: queue.value.length,
  }),
)
const sessionSize = computed<number>(() => Math.min(dueCount.value, SESSION_SIZE))
const sessionLabel = computed<string>(
  () => t('common.words', { count: sessionSize.value }, sessionSize.value),
)
const nextDueLabel = computed<string>(() => {
  const timestamp = nextDueAt(entries.value, Date.now())

  return timestamp
    ? new Date(timestamp).toLocaleDateString(locale.value, { day: 'numeric', month: 'long' })
    : ''
})

// методы
function startSession(): void {
  queue.value = dueEntries(entries.value, Date.now()).slice(0, SESSION_SIZE)
  currentIndex.value = 0
  knownCount.value = 0
  unknownCount.value = 0
  isAnswerVisible.value = false
  isSessionActive.value = true
}

function answer(isKnown: boolean): void {
  const entry = current.value
  if (!entry) return

  updateEntry(entry.id, reviewEntry(entry, isKnown, Date.now()))

  if (isKnown) knownCount.value += 1
  else unknownCount.value += 1

  isAnswerVisible.value = false
  currentIndex.value += 1
}

/**
 * Пробел показывает перевод, 1/2 — оценка. Enter начинает следующую пачку,
 * когда карточек на экране нет.
 */
function onKeyDown(event: KeyboardEvent): void {
  if (event.metaKey || event.ctrlKey || event.altKey) return

  if (!current.value) {
    if (event.key === 'Enter' && dueCount.value) {
      event.preventDefault()
      startSession()
    }

    return
  }

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
  <Card>
    <template #title>
      {{ t('training.title') }}
    </template>
    <template #subtitle>
      {{ t('training.subtitle') }}
    </template>

    <template #content>
      <div class="flex flex-col gap-4 pt-2">
        <div
          v-if="!isSessionActive"
          class="flex flex-col items-start gap-4"
        >
          <dl class="m-0 flex flex-wrap gap-x-8 gap-y-2">
            <div class="flex flex-col">
              <dt class="text-muted">
                {{ t('training.due') }}
              </dt>
              <dd class="m-0 text-2xl font-semibold">
                {{ dueCount }}
              </dd>
            </div>
            <div class="flex flex-col">
              <dt class="text-muted">
                {{ t('training.fresh') }}
              </dt>
              <dd class="m-0 text-2xl font-semibold">
                {{ newCount }}
              </dd>
            </div>
            <div class="flex flex-col">
              <dt class="text-muted">
                {{ t('training.total') }}
              </dt>
              <dd class="m-0 text-2xl font-semibold">
                {{ entries.length }}
              </dd>
            </div>
          </dl>

          <Button
            v-if="dueCount"
            :label="t('training.start', { words: sessionLabel })"
            @click="startSession"
          />

          <p
            v-else-if="entries.length"
            class="m-0 text-muted"
          >
            {{ t('training.allDone') }}{{ nextDueLabel ? ` ${t('training.nextDue', { date: nextDueLabel })}` : '' }}
          </p>

          <p
            v-else
            class="m-0 text-muted"
          >
            {{ t('training.dictionaryEmpty') }}
          </p>
        </div>

        <div
          v-else-if="current"
          class="flex flex-col gap-4"
        >
          <p class="m-0 text-muted">
            {{ progressLabel }}
          </p>

          <div class="flex min-h-48 flex-col items-center justify-center gap-3 rounded-md border border-line p-6 text-center">
            <p class="m-0 text-2xl font-semibold">
              {{ current.original }}
            </p>

            <p
              v-if="current.context"
              class="m-0 text-muted italic"
            >
              {{ current.context }}
            </p>

            <template v-if="isAnswerVisible">
              <p class="m-0 text-xl">
                {{ current.translate }}
              </p>
              <p
                v-if="current.explanation"
                class="m-0 text-sm text-muted"
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

          <p class="m-0 text-center text-sm text-muted">
            {{ t(isAnswerVisible ? 'training.keysAnswer' : 'training.keysShow') }}
          </p>
        </div>

        <div
          v-else-if="isFinished"
          class="flex flex-col items-start gap-3"
        >
          <p class="m-0">
            {{ t('training.finished', { known: knownCount, unknown: unknownCount }) }}
          </p>
          <Button
            v-if="dueCount"
            :label="t('training.more', { words: sessionLabel })"
            severity="secondary"
            @click="startSession"
          />
          <Button
            v-else
            :label="t('training.back')"
            severity="secondary"
            @click="isSessionActive = false"
          />
        </div>
      </div>
    </template>
  </Card>
</template>
