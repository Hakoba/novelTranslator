<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, X } from 'lucide-vue-next'
import { useDictionary } from '@/composables/useDictionary'
import { countNew, dueEntries, nextDueAt, reviewEntry } from '@/utils/srs'
import type { DictionaryEntry } from '@/types/words'

/** Больше за раз всё равно не удержать, а очередь может накопиться в сотни слов */
const SESSION_SIZE = 20

// composables
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
const progressLabel = computed<string>(
  () => `${Math.min(currentIndex.value + 1, queue.value.length)} из ${queue.value.length}`,
)
const nextDueLabel = computed<string>(() => {
  const timestamp = nextDueAt(entries.value, Date.now())

  return timestamp
    ? new Date(timestamp).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
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
</script>

<template>
  <Card>
    <template #title>
      Тренировка
    </template>
    <template #subtitle>
      Слово возвращается через 1, 3, 7, 16, 35 и 90 дней. Ошибка сбрасывает отсчёт
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
                К повторению
              </dt>
              <dd class="m-0 text-2xl font-semibold">
                {{ dueCount }}
              </dd>
            </div>
            <div class="flex flex-col">
              <dt class="text-muted">
                Ни разу не повторяли
              </dt>
              <dd class="m-0 text-2xl font-semibold">
                {{ newCount }}
              </dd>
            </div>
            <div class="flex flex-col">
              <dt class="text-muted">
                Всего в словаре
              </dt>
              <dd class="m-0 text-2xl font-semibold">
                {{ entries.length }}
              </dd>
            </div>
          </dl>

          <Button
            v-if="dueCount"
            :label="`Начать — ${Math.min(dueCount, SESSION_SIZE)} слов`"
            @click="startSession"
          />

          <p
            v-else-if="entries.length"
            class="m-0 text-muted"
          >
            На сегодня всё.{{ nextDueLabel ? ` Следующее повторение — ${nextDueLabel}.` : '' }}
          </p>

          <p
            v-else
            class="m-0 text-muted"
          >
            Словарь пуст — тренировать нечего. Слова добавляются из оверлея на странице.
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
              label="Показать перевод"
              @click="isAnswerVisible = true"
            />

            <template v-else>
              <Button
                severity="danger"
                outlined
                label="Не знал"
                @click="answer(false)"
              >
                <template #icon>
                  <X :size="16" />
                </template>
              </Button>
              <Button
                severity="success"
                label="Знал"
                @click="answer(true)"
              >
                <template #icon>
                  <Check :size="16" />
                </template>
              </Button>
            </template>
          </div>
        </div>

        <div
          v-else-if="isFinished"
          class="flex flex-col items-start gap-3"
        >
          <p class="m-0">
            Готово: {{ knownCount }} вспомнили, {{ unknownCount }} вернутся завтра.
          </p>
          <Button
            v-if="dueCount"
            :label="`Ещё ${Math.min(dueCount, SESSION_SIZE)} слов`"
            severity="secondary"
            @click="startSession"
          />
          <Button
            v-else
            label="Вернуться"
            severity="secondary"
            @click="isSessionActive = false"
          />
        </div>
      </div>
    </template>
  </Card>
</template>
