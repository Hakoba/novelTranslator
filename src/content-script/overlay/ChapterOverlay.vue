<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import Button from 'primevue/button'
import OverlayHeader from './components/OverlayHeader.vue'
import WordItem from './components/WordItem.vue'
import { useDifficultWords } from '@/composables/useDifficultWords'
import { useDictionary } from '@/composables/useDictionary'
import { useAreaSelectors } from '@/composables/useAreaSelectors'
import { useTextSelection } from '@/composables/useTextSelection'
import { startAreaPicker } from '@/content-script/areaPicker'
import { clearHighlights, highlightTerms } from '@/utils/highlight'
import { translateTerm } from '@/utils/translateTerm'
import { normalizeTerm } from '@/utils/dictionary'
import { findSentence } from '@/utils/sentence'
import type { WordWithExplanation } from '@/types/words'

const emit = defineEmits<{ (e: 'close'): void }>()

// composables
const {
  words,
  sourceText,
  isLoading,
  errorMessage,
  fetchDifficultWords,
} = useDifficultWords()
const { entries, addEntry } = useDictionary()
const { setSelector } = useAreaSelectors()
const { anchor, clearSelection } = useTextSelection()

// state
const isMinimized = ref<boolean>(false)
const cancelPicking = ref<(() => void) | undefined>(undefined)
const selectionState = ref<'idle' | 'saving' | 'failed'>('idle')
// снимок словаря на момент разбора: если фильтровать по живому, строка исчезает
// из списка прямо под курсором в момент клика по закладке
const knownTerms = ref<Set<string>>(new Set())

// computed
const newWords = computed<WordWithExplanation[]>(() =>
  words.value.filter((word) => !knownTerms.value.has(normalizeTerm(word.original))),
)
const savedTerms = computed<string[]>(() => entries.value.map((entry) => entry.original))

// watchers
watch(words, (): void => {
  knownTerms.value = new Set(entries.value.map((entry) => normalizeTerm(entry.original)))
})

watch([newWords, savedTerms, isLoading], (): void => {
  if (isLoading.value) return

  clearHighlights()
  highlightTerms([
    { terms: savedTerms.value, variant: 'saved' },
    { terms: newWords.value.map((word) => word.original), variant: 'new' },
  ])
})

// lifecycle
onMounted((): void => {
  void fetchDifficultWords()
})

onUnmounted((): void => {
  clearHighlights()
  cancelPicking.value?.()
})

// методы
function togglePicking(): void {
  if (cancelPicking.value) {
    cancelPicking.value()
    return
  }

  // сворачиваемся, чтобы панель не закрывала выбираемый текст
  isMinimized.value = true
  cancelPicking.value = startAreaPicker((selector) => {
    cancelPicking.value = undefined
    isMinimized.value = false

    if (!selector) return

    setSelector(location.host, selector)
    void fetchDifficultWords()
  })
}

function addToDictionary(word: WordWithExplanation): void {
  addEntry({
    original: word.original,
    translate: word.translate,
    context: findSentence(sourceText.value, word.original),
    explanation: word.explanation,
    level: word.level,
  })
}

/** Выделенную фразу переводим отдельно: в разборе главы её может и не быть */
async function saveSelection(): Promise<void> {
  const selected = anchor.value
  if (!selected || selectionState.value === 'saving') return

  selectionState.value = 'saving'
  const context = findSentence(sourceText.value, selected.text)

  try {
    const word = await translateTerm(selected.text, context ?? '')
    if (!word) throw new Error('перевод не найден')

    addEntry({ original: selected.text, translate: word.translate, context, level: word.level })
    selectionState.value = 'idle'
    clearSelection()
  } catch {
    selectionState.value = 'failed'
  }
}
</script>

<template>
  <div
    v-if="anchor"
    class="fixed -translate-x-1/2 -translate-y-[calc(100%+8px)]"
    :style="{ left: `${anchor.x}px`, top: `${anchor.y}px` }"
  >
    <Button
      size="small"
      :label="{ idle: 'В словарь', saving: 'Перевожу…', failed: 'Не вышло, ещё раз' }[selectionState]"
      :severity="selectionState === 'failed' ? 'danger' : 'primary'"
      :disabled="selectionState === 'saving'"
      @click="saveSelection"
    />
  </div>

  <section
    class="fixed bottom-4 right-4 flex max-h-[70vh] w-[420px] max-w-[calc(100vw-2rem)] flex-col
           overflow-hidden rounded-xl border border-line bg-surface text-content
           shadow-[0_10px_32px_-8px_rgba(0,0,0,.35)]"
    aria-label="Novel Translator"
  >
    <header class="border-b border-line px-3 py-2.5">
      <OverlayHeader
        :is-minimized="isMinimized"
        :words-count="newWords.length"
        :is-loading="isLoading"
        :is-picking="Boolean(cancelPicking)"
        @toggle-minimized="isMinimized = !isMinimized"
        @pick-area="togglePicking"
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
        v-else-if="newWords.length"
        class="m-0 flex list-none flex-col gap-1.5 p-0"
      >
        <WordItem
          v-for="word in newWords"
          :key="word.original"
          :word="word"
          :source-text="sourceText"
          @add-to-dictionary="addToDictionary"
        />
      </ul>

      <p
        v-else
        class="m-0 text-muted"
      >
        {{ words.length ? 'Все сложные слова этой главы уже в словаре.' : 'Сложных слов не нашлось.' }}
      </p>
    </div>
  </section>
</template>
