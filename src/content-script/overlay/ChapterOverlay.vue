<script setup lang="ts">
import { defineEmits, ref, onMounted, watch, onUnmounted } from 'vue'
import { useDifficultWords } from '@/composables/useDifficultWords'
import type { WordWithExplanation } from '@/types/words'
import OverlayHeader from './components/OverlayHeader.vue'
import WordItem from './components/WordItem.vue'
import { highlightTerms, clearHighlights } from '@/utils/highlight'

const emit = defineEmits<{ (e: 'close'): void }>()

// state
const isPinned = ref<boolean>(true)
const isMinimized = ref<boolean>(false)

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
function closeOverlay(): void {
  emit('close')
}
function addToDictionary(word: WordWithExplanation): void {
  // placeholder for future implementation
  void word
}
</script>

<template>
  <section class="nt-overlay-root" :class="{ 'nt-pinned': isPinned, 'nt-floating': !isPinned }">
    <div class="nt-card" :class="{ 'nt-minimized': isMinimized, 'nt-expanded': !isMinimized }">
      <OverlayHeader
        :isPinned="isPinned"
        :isMinimized="isMinimized"
        :wordsCount="wordsCount"
        :isLoading="isLoading"
        @togglePinned="togglePinned"
        @toggleMinimized="toggleMinimized"
        @close="closeOverlay"
      />

      <div v-if="!isMinimized" class="nt-body">
        <template v-if="isLoading">
          <p class="nt-muted">Загрузка…</p>
        </template>
        <template v-else>
          <template v-if="words.length">
            <ul class="nt-list" role="list">
              <WordItem
                v-for="word in words"
                :key="word.original"
                :word="word"
                @addToDictionary="addToDictionary"
              />
            </ul>
          </template>
          <p v-else class="nt-muted">Пока ничего не найдено.</p>
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped>
.nt-overlay-root {
  position: fixed;
  inset: auto auto auto 50%;
  transform: translateX(-50%);
  z-index: 2147483647; /* on top */
  padding: 0.5rem;
}
.nt-overlay-root.nt-floating {
  inset: auto 1rem 1rem auto;
  transform: none;
}

.nt-card {
  background: var(--nt-bg, #ffffff);
  color: var(--nt-fg, #0f172a);
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 0.75rem;
  box-shadow: 0 20px 25px -5px rgba(0,0,0,.1), 0 8px 10px -6px rgba(0,0,0,.1);
  overflow: hidden;
  transition: height .2s ease, max-height .2s ease;
  width: min(92vw, 560px);
}

.nt-minimized { height: 4rem; }
.nt-expanded { max-height: 80vh; overflow-y: auto; }

.nt-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  cursor: pointer;
  user-select: none;
}
.nt-header-left { display: inline-flex; align-items: center; gap: 0.5rem; }
.nt-header-icon { font-size: 1.25rem; }
.nt-title { font-weight: 600; }
.nt-badge { background: #eef2ff; color: #4338ca; padding: 0 0.5rem; border-radius: 9999px; font-size: 0.75rem; line-height: 1.5; }
.nt-header-actions { display: inline-flex; gap: 0.25rem; }
.nt-icon-btn { background: transparent; border: none; padding: 0.25rem 0.5rem; border-radius: 0.5rem; cursor: pointer; }
.nt-icon-btn:hover { background: rgba(0,0,0,.05); }

.nt-body { padding: 1rem; }
.nt-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.5rem; }
.nt-list-item { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; padding: 0.5rem; border: 1px solid rgba(15, 23, 42, 0.06); border-radius: 0.5rem; }
.nt-word { display: grid; }
.nt-word-text { font-weight: 500; }
.nt-word-explanation { color: #64748b; }
.nt-btn { background: #111827; color: white; border: none; padding: 0.4rem 0.6rem; border-radius: 0.375rem; cursor: pointer; }
.nt-btn:hover { background: #0b1220; }

@media (prefers-color-scheme: dark) {
  .nt-card { background: #0b1220; color: #e5e7eb; border-color: rgba(148, 163, 184, 0.2); }
  .nt-icon-btn:hover { background: rgba(255,255,255,.06); }
  .nt-badge { background: #1e293b; color: #93c5fd; }
  .nt-list-item { border-color: rgba(148, 163, 184, 0.25); }
  .nt-word-explanation { color: #94a3b8; }
  .nt-btn { background: #16a34a; }
  .nt-btn:hover { background: #15803d; }
}
</style>
