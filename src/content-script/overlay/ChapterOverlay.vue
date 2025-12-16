<script setup lang="ts">
import { defineEmits, ref, onMounted, watch, onUnmounted } from 'vue'
import Dialog from 'primevue/dialog'
import { useDifficultWords } from '@/composables/useDifficultWords'
import type { WordWithExplanation } from '@/types/words'
import OverlayHeader from './components/OverlayHeader.vue'
import WordItem from './components/WordItem.vue'
import { highlightTerms, clearHighlights } from '@/utils/highlight'

const emit = defineEmits<{ (e: 'close'): void }>()

// state
const isPinned = ref<boolean>(true)
const isMinimized = ref<boolean>(false)
const isVisible = ref<boolean>(true)

// composables
const { words, isLoading, wordsCount, fetchDifficultWords } = useDifficultWords()

onMounted((): void => {
  void fetchDifficultWords()
})

// watchers
watch([words, isLoading], (vals): void => {
  const [list, loading] = vals
  if (loading) return
  const terms = list.map((w) => w.original)
  clearHighlights()
  if (terms.length) highlightTerms(terms)
})

onUnmounted((): void => {
  clearHighlights()
})

// methods
function togglePinned(): void {
  isPinned.value = !isPinned.value
}
function toggleMinimized(): void {
  isMinimized.value = !isMinimized.value
}
function handleVisibleChange(val: boolean): void {
  if (!val) closeOverlay()
}
function closeOverlay(): void {
  emit('close')
}
function addToDictionary(word: WordWithExplanation): void {
  void word
}
</script>

<template>
  <Dialog
    v-model:visible="isVisible"
    :modal="false"
    :draggable="true"
    :dismissableMask="false"
    :position="isPinned ? 'center' : 'bottom-right'"
    :style="{ width: '550px', maxWidth: '92vw' }"
    @update:visible="handleVisibleChange"
  >
    <template v-slot:header>
      <OverlayHeader
        :isPinned="isPinned"
        :isMinimized="isMinimized"
        :wordsCount="wordsCount"
        :isLoading="isLoading"
        @togglePinned="togglePinned"
        @toggleMinimized="toggleMinimized"
        @close="closeOverlay"
      />
    </template>

    <div v-if="!isMinimized">
      <template v-if="isLoading">
        <p>Загрузка…</p>
      </template>
      <template v-else>
        <template v-if="words.length">
          <ul role="list">
            <WordItem
              v-for="word in words"
              :key="word.original"
              :word="word"
              @addToDictionary="addToDictionary"
            />
          </ul>
        </template>
        <p v-else>Пока ничего не найдено.</p>
      </template>
    </div>
  </Dialog>
</template>
