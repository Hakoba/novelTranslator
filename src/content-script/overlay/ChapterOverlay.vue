<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { BookmarkCheck, BookmarkPlus, LoaderCircle, RotateCw } from 'lucide-vue-next'
import Button from 'primevue/button'
import OverlayHeader from './components/OverlayHeader.vue'
import AppLogo from '@/components/AppLogo.vue'
import WordCard from './components/WordCard.vue'
import WordItem from './components/WordItem.vue'
import { useDifficultWords } from '@/composables/useDifficultWords'
import { useDictionary } from '@/composables/useDictionary'
import { useAreaSelectors } from '@/composables/useAreaSelectors'
import { useHighlightHover } from '@/composables/useHighlightHover'
import { useIgnoredWords } from '@/composables/useIgnoredWords'
import { type SelectionMode, useReaderSettings } from '@/composables/useReaderSettings'
import { type SelectionAnchor, useTextSelection } from '@/composables/useTextSelection'
import { startAreaPicker } from '@/content-script/areaPicker'
import { clearHighlights, highlightTerms, replaceTerms, restoreReplacement, revealTerm } from '@/utils/highlight'
import { type ImmersionMatch, isTargetLanguageText, pickImmersionWords } from '@/utils/immersion'
import { translateTerm } from '@/utils/translateTerm'
import { normalizeTerm } from '@/utils/dictionary'
import { normalizeHost } from '@/utils/extract/rules'
import { extractReadableText } from '@/utils/pageText'
import { findSentence } from '@/utils/sentence'
import { dueInDays, reviewEntry } from '@/utils/srs'
import type { WordWithExplanation } from '@/types/words'

const emit = defineEmits<{ (e: 'close'): void }>()

// composables
const { t } = useI18n()
const {
  words,
  sourceText,
  isLoading,
  errorMessage,
  fetchDifficultWords,
} = useDifficultWords()
const { entries, addEntry, hasEntry, updateEntry } = useDictionary()
const { selectors, setSelector, clearSelector } = useAreaSelectors()
const { anchor, clearSelection } = useTextSelection()
const { isIgnored, ignoreWord } = useIgnoredWords()
const { hint } = useHighlightHover()
const { settings: readerSettings, promise: readerSettingsLoaded } = useReaderSettings()

// по букве в span — иначе волну не сдвинуть по фазе; пробел неразрывный, обычный схлопнется
const loadingChars = computed<string[]>(() =>
  [...t('overlay.analyzing')].map((char) => char === ' ' ? '\u00a0' : char),
)

// state
const isMinimized = ref<boolean>(false)
// разбор ещё не запускали: с выключенным автозапуском вместо пустого списка нужна кнопка
const isStarted = ref<boolean>(false)
const cancelPicking = ref<(() => void) | undefined>(undefined)
/** Перевод выделенного: `idle` — ещё не просили, дальше по ходу запроса */
const selectionStage = ref<'idle' | 'loading' | 'ready' | 'failed'>('idle')
const selectionWord = ref<WordWithExplanation | undefined>(undefined)
// снимок словаря на момент разбора: если фильтровать по живому, строка исчезает
// из списка прямо под курсором в момент клика по закладке
const knownTerms = ref<Set<string>>(new Set())
/** Страница распознана как родная, слова словаря вкраплены в текст */
const isImmersionActive = ref<boolean>(false)
const immersionWords = ref<ImmersionMatch[]>([])

// computed
// скрытое слово убираем по живому списку, а не по снимку: строка должна пропасть сразу
const newWords = computed<WordWithExplanation[]>(() =>
  words.value.filter(
    (word) => !knownTerms.value.has(normalizeTerm(word.original)) && !isIgnored(word.original),
  ),
)
const hasArea = computed<boolean>(() =>
  selectors.value.some((item) => item.host === normalizeHost(location.host)),
)
const savedTerms = computed<string[]>(() => entries.value.map((entry) => entry.original))

const selectionMode = computed<SelectionMode>(() => readerSettings.value.selectionMode)

const saveSelectionLabel = computed<string>(() => {
  if (selectionStage.value === 'loading') return t('overlay.saveSelectionBusy')
  if (selectionStage.value === 'failed') return t('overlay.saveSelectionFailed')

  return t('overlay.saveSelection')
})

/**
 * Карточка для слова под курсором. Данные берём из живых списков, а не из
 * атрибутов подсветки: добавили слово в словарь — подсказка расскажет об этом
 * сразу, без переразметки страницы.
 */
const hoverWord = computed<WordWithExplanation | undefined>(() => {
  const term = hint.value?.term
  if (!term) return undefined

  const key = normalizeTerm(term)
  const saved = entries.value.find((entry) => normalizeTerm(entry.original) === key)
  const found = words.value.find((word) => normalizeTerm(word.original) === key)

  if (!saved && !found) return undefined

  return {
    original: term,
    translate: found?.translate ?? saved?.translate ?? '',
    level: found?.level ?? saved?.level,
  }
})

/** Вкрапление под курсором: текст метки — изучаемое слово, по нему и ищем запись */
const hoverImmersion = computed<ImmersionMatch | undefined>(() => {
  const term = hint.value?.term
  if (!term) return undefined

  const key = normalizeTerm(term)

  return immersionWords.value.find((match) => normalizeTerm(match.entry.original) === key)
})

// watchers
watch(words, (): void => {
  knownTerms.value = new Set(entries.value.map((entry) => normalizeTerm(entry.original)))
})

// новое выделение — новый перевод; в режиме «сразу перевод» запрос уходит без клика
watch(anchor, (selected): void => {
  selectionStage.value = 'idle'
  selectionWord.value = undefined

  if (selected && selectionMode.value === 'translate') void translateSelection()
})

// immediate: без разбора страницы ничего не меняется, а сохранённые слова подсветить надо сразу
watch([newWords, savedTerms, isLoading], (): void => {
  // при активных вкраплениях clearHighlights стёр бы их после первого же ответа
  if (isLoading.value || isImmersionActive.value) return

  clearHighlights()
  highlightTerms([
    { terms: savedTerms.value, variant: 'saved' },
    { terms: newWords.value.map((word) => word.original), variant: 'new' },
  ])
}, { immediate: true })

// выключили режим — вернуть оригиналы и продолжить как обычно, без перезагрузки
watch(() => readerSettings.value.immersion, (): void => {
  clearHighlights()
  immersionWords.value = []
  isImmersionActive.value = false

  if (isStarted.value) void analyze()
})

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
/**
 * `full` — читать страницу целиком: смена области и ручной перезапуск отменяют
 * прошлый разбор. Единственная развилка режимов: страница на языке перевода
 * при включённых вкраплениях идёт не в разбор, а в подмену слов.
 */
async function analyze(full = false): Promise<void> {
  isStarted.value = true

  if (readerSettings.value.immersion) {
    const { sourceLang, targetLang } = readerSettings.value
    const pageText = await extractReadableText()

    if (isTargetLanguageText(pageText, targetLang, sourceLang)) {
      startImmersion(pageText)
      return
    }
  }

  if (isImmersionActive.value) {
    clearHighlights()
    immersionWords.value = []
    isImmersionActive.value = false
  }

  return fetchDifficultWords(full)
}

/** Режим вкраплений работает офлайн: только словарь, без модели и внешних словарей */
function startImmersion(pageText: string): void {
  clearHighlights()
  isImmersionActive.value = true
  immersionWords.value = pickImmersionWords(pageText, entries.value, Date.now())
  replaceTerms(immersionWords.value.map((match) => ({ form: match.form, text: match.entry.original })))
}

/** Самооценка двигает SRS той же лестницей, что тренировка; метка раскрывается в оригинал */
function answerImmersion(match: ImmersionMatch, isKnown: boolean): void {
  updateEntry(match.entry.id, reviewEntry(match.entry, isKnown, Date.now()))
  restoreReplacement(match.entry.original)
  immersionWords.value = immersionWords.value.filter((item) => item !== match)
}

/** Разбор перезапускаем сразу: иначе на экране остаётся результат по прошлой области */
function resetArea(): void {
  clearSelector(location.host)
  if (isStarted.value) void analyze(true)
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
    void analyze(true)
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

/**
 * У бокового края экрана центрированная карточка обрезалась бы: зажимаем `left`
 * по полуширине самой широкой карточки (max-w-72 = 288px) с отступом 8px.
 * Узкая карточка у края встанет чуть правее слова — это дешевле измерения ширины.
 */
function clampX(x: number): string {
  return `clamp(152px, ${x}px, calc(100vw - 152px))`
}

/** Слово уже в словаре — вместо «найдено на странице» говорим, когда его повторять */
function savedNote(term: string): string | undefined {
  const key = normalizeTerm(term)
  const saved = entries.value.find((entry) => normalizeTerm(entry.original) === key)
  if (!saved) return undefined

  const days = dueInDays(saved.dueAt, Date.now())

  return days ? t('overlay.savedDue', { count: days }, days) : t('overlay.saved')
}

/** Абзац рядом с выделением точнее разобранного текста, но тот выручает при переносах строк */
function selectionContext(selected: SelectionAnchor): string | undefined {
  return selected.context ?? findSentence(sourceText.value, selected.text)
}

/** Выделенную фразу переводим отдельно: в разборе страницы её может и не быть */
async function translateSelection(): Promise<void> {
  const selected = anchor.value
  if (!selected || selectionStage.value === 'loading') return

  selectionStage.value = 'loading'

  try {
    const word = await translateTerm(selected.text, selectionContext(selected) ?? '')
    // пока ходили за переводом, выделение могли сменить — тот ответ уже не к месту
    if (anchor.value?.text !== selected.text) return
    if (!word) throw new Error(t('errors.translationMissing'))

    selectionWord.value = word
    selectionStage.value = 'ready'
  } catch {
    if (anchor.value?.text === selected.text) selectionStage.value = 'failed'
  }
}

function saveSelectionWord(): void {
  const selected = anchor.value
  const word = selectionWord.value
  if (!selected || !word) return

  addEntry({
    original: selected.text,
    translate: word.translate,
    context: selectionContext(selected),
    level: word.level,
  })
}

/** Режим «сразу в словарь»: перевод не показываем, одним действием переводим и сохраняем */
async function translateAndSave(): Promise<void> {
  await translateSelection()
  if (selectionStage.value !== 'ready') return

  saveSelectionWord()
  clearSelection()
}
</script>

<template>
  <!-- зазор до слова закрыт паддингом обёртки: курсор доезжает до кнопок, не теряя карточку -->
  <div
    v-if="hint && hoverImmersion"
    class="fixed -translate-x-1/2 -translate-y-full pb-1.5"
    :style="{ left: clampX(hint.x), top: `${hint.y}px` }"
  >
    <WordCard
      :term="hoverImmersion.entry.original"
      :translate="hoverImmersion.entry.translate"
      :level="hoverImmersion.entry.level"
      :note="t('overlay.immersionOriginal', { form: hoverImmersion.form })"
    >
      <div class="flex justify-end gap-2">
        <Button
          size="small"
          severity="danger"
          outlined
          :label="t('training.unknown')"
          @click="answerImmersion(hoverImmersion, false)"
        />
        <Button
          size="small"
          severity="success"
          outlined
          :label="t('training.known')"
          @click="answerImmersion(hoverImmersion, true)"
        />
      </div>
    </WordCard>
  </div>

  <!-- подсказка не перехватывает мышь: иначе курсор «проваливался» бы в неё с самого слова -->
  <div
    v-else-if="hint && hoverWord"
    class="fixed -translate-x-1/2 -translate-y-[calc(100%+6px)]"
    :style="{ left: clampX(hint.x), top: `${hint.y}px`, pointerEvents: 'none' }"
  >
    <WordCard
      :term="hoverWord.original"
      :translate="hoverWord.translate"
      :level="hoverWord.level"
      :note="savedNote(hoverWord.original) ?? t('overlay.foundHere')"
    />
  </div>

  <div
    v-if="anchor && selectionMode !== 'off'"
    class="fixed -translate-x-1/2 -translate-y-[calc(100%+8px)]"
    :style="{ left: clampX(anchor.x), top: `${anchor.y}px` }"
  >
    <!-- предохранитель: перевод стоит запроса, поэтому сначала спрашиваем, нужен ли он -->
    <Button
      v-if="selectionMode === 'hint' && selectionStage === 'idle'"
      size="small"
      rounded
      raised
      :aria-label="t('overlay.translateSelection')"
      @click="translateSelection"
    >
      <template #icon>
        <AppLogo :size="16" />
      </template>
    </Button>

    <Button
      v-else-if="selectionMode === 'save'"
      size="small"
      rounded
      raised
      :label="saveSelectionLabel"
      :severity="selectionStage === 'failed' ? 'danger' : 'primary'"
      :disabled="selectionStage === 'loading'"
      @click="translateAndSave"
    >
      <template #icon>
        <!-- спиннер PrimeVue — иконочный шрифт, которого в оверлее нет: крутим свою иконку -->
        <LoaderCircle
          v-if="selectionStage === 'loading'"
          :size="16"
          class="animate-spin"
        />
        <RotateCw
          v-else-if="selectionStage === 'failed'"
          :size="16"
        />
        <BookmarkPlus
          v-else
          :size="16"
        />
      </template>
    </Button>

    <WordCard
      v-else
      :term="anchor.text"
      :translate="selectionStage === 'failed' ? t('overlay.translateFailed') : selectionWord?.translate"
      :level="selectionWord?.level"
      :note="savedNote(anchor.text)"
      :is-loading="selectionStage === 'loading'"
    >
      <div class="flex justify-end">
        <Button
          v-if="selectionStage === 'failed'"
          size="small"
          severity="secondary"
          outlined
          :label="t('common.retry')"
          @click="translateSelection"
        >
          <template #icon>
            <RotateCw :size="16" />
          </template>
        </Button>

        <Button
          v-else
          size="small"
          severity="success"
          outlined
          :disabled="selectionStage !== 'ready' || hasEntry(anchor.text)"
          :label="t(hasEntry(anchor.text) ? 'overlay.alreadySaved' : 'overlay.addToDictionary')"
          @click="saveSelectionWord"
        >
          <template #icon>
            <BookmarkCheck
              v-if="hasEntry(anchor.text)"
              :size="16"
            />
            <BookmarkPlus
              v-else
              :size="16"
            />
          </template>
        </Button>
      </div>
    </WordCard>
  </div>

  <section
    class="fixed bottom-4 right-4 flex max-h-[70vh] w-[420px] max-w-[calc(100vw-2rem)] flex-col
           rounded-xl border border-line bg-surface text-content
           shadow-[0_10px_32px_-8px_rgba(0,0,0,.35)]"
    aria-label="Erudit"
  >
    <header class="border-b border-line px-3 py-2.5">
      <OverlayHeader
        :is-minimized="isMinimized"
        :words-count="newWords.length"
        :is-loading="isLoading"
        :is-picking="Boolean(cancelPicking)"
        :has-area="hasArea"
        :is-started="isStarted"
        :is-immersion="readerSettings.immersion"
        @toggle-minimized="isMinimized = !isMinimized"
        @pick-area="togglePicking"
        @reset-area="resetArea"
        @reread="analyze(true)"
        @toggle-immersion="readerSettings.immersion = !readerSettings.immersion"
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
          {{ t('overlay.autoAnalyzeOff') }}
        </p>
        <Button
          size="small"
          :label="t('overlay.analyze')"
          @click="analyze()"
        />
      </div>

      <div
        v-else-if="isLoading"
        class="flex flex-col items-center gap-3 py-10"
        :aria-label="t('overlay.analyzing')"
        aria-busy="true"
      >
        <p
          class="nt-wave m-0 text-lg font-medium"
          aria-hidden="true"
        >
          <span
            v-for="(char, index) in loadingChars"
            :key="index"
            :style="{ animationDelay: `${index * 55}ms` }"
          >{{ char }}</span>
        </p>
        <div class="nt-bar w-40" />
      </div>

      <p
        v-else-if="isImmersionActive"
        class="m-0 text-muted"
      >
        {{ t('overlay.immersionActive', { count: immersionWords.length }) }}
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
          :label="t('common.retry')"
          @click="analyze()"
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
            :label="t('overlay.addAll', { count: newWords.length })"
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
            @ignore="ignoreWord(word.original)"
            @reveal="revealTerm(word.original)"
          />
        </ul>
      </div>

      <p
        v-else
        class="m-0 text-muted"
      >
        {{ t(words.length ? 'overlay.allKnown' : 'overlay.nothingFound') }}
      </p>
    </div>
  </section>
</template>
