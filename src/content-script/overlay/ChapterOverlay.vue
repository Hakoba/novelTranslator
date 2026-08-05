<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { BookmarkPlus, LoaderCircle, RotateCw } from 'lucide-vue-next'
import Button from 'primevue/button'
import OverlayHeader from './components/OverlayHeader.vue'
import WordItem from './components/WordItem.vue'
import { useDifficultWords } from '@/composables/useDifficultWords'
import { useDictionary } from '@/composables/useDictionary'
import { useAreaSelectors } from '@/composables/useAreaSelectors'
import { useHighlightHover } from '@/composables/useHighlightHover'
import { useReaderSettings } from '@/composables/useReaderSettings'
import { useTextSelection } from '@/composables/useTextSelection'
import { startAreaPicker } from '@/content-script/areaPicker'
import { clearHighlights, highlightTerms, type HighlightTerm } from '@/utils/highlight'
import { translateTerm } from '@/utils/translateTerm'
import { normalizeTerm } from '@/utils/dictionary'
import { normalizeHost } from '@/utils/extract/rules'
import { findSentence } from '@/utils/sentence'
import type { WordWithExplanation } from '@/types/words'

const emit = defineEmits<{ (e: 'close'): void }>()

// по букве в span — иначе волну не сдвинуть по фазе; пробел неразрывный, обычный схлопнется
const LOADING_CHARS: string[] = [...'Разбираю страницу'].map((char) => char === ' ' ? ' ' : char)

// composables
const {
  words,
  sourceText,
  isLoading,
  errorMessage,
  fetchDifficultWords,
} = useDifficultWords()
const { entries, addEntry } = useDictionary()
const { selectors, setSelector, clearSelector } = useAreaSelectors()
const { anchor, clearSelection } = useTextSelection()
const { hint } = useHighlightHover()
const { settings: readerSettings, promise: readerSettingsLoaded } = useReaderSettings()

// state
const isMinimized = ref<boolean>(false)
// разбор ещё не запускали: с выключенным автозапуском вместо пустого списка нужна кнопка
const isStarted = ref<boolean>(false)
const cancelPicking = ref<(() => void) | undefined>(undefined)
const selectionState = ref<'idle' | 'saving' | 'failed'>('idle')
// снимок словаря на момент разбора: если фильтровать по живому, строка исчезает
// из списка прямо под курсором в момент клика по закладке
const knownTerms = ref<Set<string>>(new Set())

// computed
const newWords = computed<WordWithExplanation[]>(() =>
  words.value.filter((word) => !knownTerms.value.has(normalizeTerm(word.original))),
)
const hasArea = computed<boolean>(() =>
  selectors.value.some((item) => item.host === normalizeHost(location.host)),
)
const savedTerms = computed<HighlightTerm[]>(() =>
  entries.value.map((entry) => ({ text: entry.original, translate: entry.translate })),
)

// watchers
watch(words, (): void => {
  knownTerms.value = new Set(entries.value.map((entry) => normalizeTerm(entry.original)))
})

// immediate: без разбора страницы ничего не меняется, а сохранённые слова подсветить надо сразу
watch([newWords, savedTerms, isLoading], (): void => {
  if (isLoading.value) return

  clearHighlights()
  highlightTerms([
    { terms: savedTerms.value, variant: 'saved' },
    {
      terms: newWords.value.map((word) => ({ text: word.original, translate: word.translate })),
      variant: 'new',
    },
  ])
}, { immediate: true })

// lifecycle
onMounted(async (): Promise<void> => {
  await readerSettingsLoaded
  if (readerSettings.value.autoAnalyze) void analyze()
})

onUnmounted((): void => {
  clearHighlights()
  cancelPicking.value?.()
})

// методы
function analyze(): Promise<void> {
  isStarted.value = true

  return fetchDifficultWords()
}

/** Разбор перезапускаем сразу: иначе на экране остаётся результат по прошлой области */
function resetArea(): void {
  clearSelector(location.host)
  if (isStarted.value) void analyze()
}

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
    void analyze()
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

/** Пояснения тут не будет: их подтягивает WordItem, а списком слов их никто не раскрывал */
function addAll(): void {
  newWords.value.forEach(addToDictionary)
}

/** Выделенную фразу переводим отдельно: в разборе страницы её может и не быть */
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
    v-if="hint"
    class="fixed max-w-64 -translate-x-1/2 -translate-y-[calc(100%+6px)] rounded-md border border-line
           bg-surface px-2 py-1 text-sm text-content shadow-[0_6px_20px_-6px_rgba(0,0,0,.4)]"
    :style="{ left: `${hint.x}px`, top: `${hint.y}px`, pointerEvents: 'none' }"
  >
    {{ hint.translate }}
  </div>

  <div
    v-if="anchor"
    class="fixed -translate-x-1/2 -translate-y-[calc(100%+8px)]"
    :style="{ left: `${anchor.x}px`, top: `${anchor.y}px` }"
  >
    <Button
      size="small"
      rounded
      raised
      :label="{ idle: 'В словарь', saving: 'Перевожу…', failed: 'Ещё раз' }[selectionState]"
      :severity="selectionState === 'failed' ? 'danger' : 'primary'"
      :disabled="selectionState === 'saving'"
      @click="saveSelection"
    >
      <template #icon>
        <!-- спиннер PrimeVue — иконочный шрифт, которого в оверлее нет: крутим свою иконку -->
        <LoaderCircle
          v-if="selectionState === 'saving'"
          :size="16"
          class="animate-spin"
        />
        <RotateCw
          v-else-if="selectionState === 'failed'"
          :size="16"
        />
        <BookmarkPlus
          v-else
          :size="16"
        />
      </template>
    </Button>
  </div>

  <section
    class="fixed bottom-4 right-4 flex max-h-[70vh] w-[420px] max-w-[calc(100vw-2rem)] flex-col
           rounded-xl border border-line bg-surface text-content
           shadow-[0_10px_32px_-8px_rgba(0,0,0,.35)]"
    aria-label="Novel Translator"
  >
    <header class="border-b border-line px-3 py-2.5">
      <OverlayHeader
        :is-minimized="isMinimized"
        :words-count="newWords.length"
        :is-loading="isLoading"
        :is-picking="Boolean(cancelPicking)"
        :has-area="hasArea"
        @toggle-minimized="isMinimized = !isMinimized"
        @pick-area="togglePicking"
        @reset-area="resetArea"
        @close="emit('close')"
      />
    </header>

    <!-- скругление на теле, а не overflow-hidden на секции: тот резал бы подсказки к кнопкам -->
    <div
      v-if="!isMinimized"
      class="flex-1 overflow-y-auto rounded-b-xl p-3"
    >
      <div
        v-if="!isStarted"
        class="flex flex-col items-start gap-2"
      >
        <p class="m-0 text-muted">
          Автозапуск разбора выключен в настройках. Сохранённые слова на странице
          подсвечены — перевод виден при наведении.
        </p>
        <Button
          size="small"
          label="Разобрать страницу"
          @click="analyze"
        />
      </div>

      <div
        v-else-if="isLoading"
        class="flex flex-col items-center gap-3 py-10"
        aria-label="Разбираю страницу"
        aria-busy="true"
      >
        <p
          class="nt-wave m-0 text-lg font-medium"
          aria-hidden="true"
        >
          <span
            v-for="(char, index) in LOADING_CHARS"
            :key="index"
            :style="{ animationDelay: `${index * 55}ms` }"
          >{{ char }}</span>
        </p>
        <div class="nt-bar w-40" />
      </div>

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
          @click="analyze"
        />
      </div>

      <div
        v-else-if="newWords.length"
        class="flex flex-col gap-2"
      >
        <!-- на одно слово кнопка не нужна: рядом с ним и так есть своя закладка -->
        <div v-if="newWords.length > 1">
          <Button
            size="small"
            severity="secondary"
            outlined
            :label="`Добавить все — ${newWords.length}`"
            @click="addAll"
          >
            <template #icon>
              <BookmarkPlus :size="16" />
            </template>
          </Button>
        </div>

        <ul class="m-0 flex list-none flex-col gap-1.5 p-0">
          <WordItem
            v-for="word in newWords"
            :key="word.original"
            :word="word"
            :source-text="sourceText"
            @add-to-dictionary="addToDictionary"
          />
        </ul>
      </div>

      <p
        v-else
        class="m-0 text-muted"
      >
        {{ words.length ? 'Все сложные слова на этой странице уже в словаре.' : 'Сложных слов не нашлось.' }}
      </p>
    </div>
  </section>
</template>
