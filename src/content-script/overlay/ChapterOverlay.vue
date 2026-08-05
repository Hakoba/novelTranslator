<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import Button from 'primevue/button'
import OverlayHeader from './components/OverlayHeader.vue'
import WordItem from './components/WordItem.vue'
import { useDifficultWords } from '@/composables/useDifficultWords'
import { clearHighlights, highlightTerms } from '@/utils/highlight'
import type { WordWithExplanation } from '@/types/words'

const emit = defineEmits<{ (e: 'close'): void }>()

// composables
const { words, isLoading, errorMessage, wordsCount, fetchDifficultWords } = useDifficultWords()

// state
const isMinimized = ref<boolean>(false)

// lifecycle
onMounted((): void => {
  void fetchDifficultWords()
})

onUnmounted((): void => {
  clearHighlights()
})

// watchers
watch([words, isLoading], (): void => {
  if (isLoading.value) return

  clearHighlights()
  const terms = words.value.map((word) => word.original)
  if (terms.length) highlightTerms(terms)
})

// методы
function addToDictionary(word: WordWithExplanation): void {
  // словарь ещё не реализован
  void word
}
</script>

<template>
  <section
    class="fixed bottom-4 right-4 flex max-h-[70vh] w-[420px] max-w-[calc(100vw-2rem)] flex-col
           overflow-hidden rounded-md border border-line bg-surface text-content
           shadow-[0_2px_12px_rgba(0,0,0,.18)]"
    aria-label="Novel Translator"
  >
    <header class="border-b border-line px-3 py-2">
      <OverlayHeader
        :is-minimized="isMinimized"
        :words-count="wordsCount"
        :is-loading="isLoading"
        @toggle-minimized="isMinimized = !isMinimized"
        @close="emit('close')"
      />
    </header>

    <div
      v-if="!isMinimized"
      class="flex-1 overflow-y-auto p-3"
    >
      <p
        v-if="isLoading"
        class="m-0 text-muted"
      >
        Разбираю главу…
      </p>

      <div
        v-else-if="errorMessage"
        class="flex flex-col items-start gap-2"
      >
        <p class="m-0 text-muted">
          {{ errorMessage }}
        </p>
        <Button
          size="small"
          label="Повторить"
          @click="fetchDifficultWords()"
        />
      </div>

      <ul
        v-else-if="words.length"
        class="m-0 flex list-none flex-col gap-2 p-0"
      >
        <WordItem
          v-for="word in words"
          :key="word.original"
          :word="word"
          @add-to-dictionary="addToDictionary"
        />
      </ul>

      <p
        v-else
        class="m-0 text-muted"
      >
        Сложных слов не нашлось.
      </p>
    </div>
  </section>
</template>
