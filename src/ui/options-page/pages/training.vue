<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import InlineSvg from '@/components/InlineSvg.vue'
import doneArt from '@/assets/illustrations/training-done.svg?raw'
import emptyArt from '@/assets/illustrations/training-empty.svg?raw'
import TrainingSession from '../components/TrainingSession.vue'
import TrainingStart from '../components/TrainingStart.vue'
import { useDictionary } from '@/composables/useDictionary'
import { SESSION_SIZE, dueEntries } from '@/utils/srs'
import type { DictionaryEntry } from '@/types/words'

/**
 * Экран живёт в трёх состояниях: набор пачки, сама пачка и её итог. Пачка отдана
 * `TrainingSession` целиком — странице от неё нужен только счёт в конце.
 */
interface SessionResult {
  known: number
  unknown: number
}

// composables
const { t } = useI18n()
const { entries } = useDictionary()

// state
const queue = ref<DictionaryEntry[]>([])
const result = ref<SessionResult | undefined>(undefined)

// computed
const dueCount = computed<number>(() => dueEntries(entries.value, Date.now()).length)
const sessionSize = computed<number>(() => Math.min(dueCount.value, SESSION_SIZE))
const sessionLabel = computed<string>(
  () => t('common.words', { count: sessionSize.value }, sessionSize.value),
)

// методы
function startSession(): void {
  queue.value = dueEntries(entries.value, Date.now()).slice(0, SESSION_SIZE)
  result.value = undefined
}

function finishSession(session: SessionResult): void {
  queue.value = []
  result.value = session
}

function leaveSummary(): void {
  result.value = undefined
}
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
      <div class="pt-2">
        <TrainingSession
          v-if="queue.length"
          :queue="queue"
          @finish="finishSession"
        />

        <div
          v-else-if="result"
          class="flex flex-col items-center gap-4 py-4 text-center"
        >
          <InlineSvg
            :markup="doneArt"
            class="w-40 text-content"
          />
          <p class="m-0 max-w-sm">
            {{ t('training.finished', { known: result.known, unknown: result.unknown }) }}
          </p>
          <Button
            v-if="dueCount"
            autofocus
            severity="secondary"
            :label="t('training.more', { words: sessionLabel })"
            @click="startSession"
          />
          <Button
            v-else
            autofocus
            severity="secondary"
            :label="t('training.back')"
            @click="leaveSummary"
          />
        </div>

        <!-- тренировать нечего: сначала надо набрать слов на странице -->
        <div
          v-else-if="!entries.length"
          class="flex flex-col items-center gap-4 py-6 text-center"
        >
          <InlineSvg
            :markup="emptyArt"
            class="w-44 text-content"
          />
          <p class="m-0 max-w-sm text-muted">
            {{ t('training.dictionaryEmpty') }}
          </p>
        </div>

        <TrainingStart
          v-else
          :entries="entries"
          @start="startSession"
        />
      </div>
    </template>
  </Card>
</template>
