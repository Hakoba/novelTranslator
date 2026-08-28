<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { BookmarkCheck, BookmarkPlus, RotateCw } from 'lucide-vue-next'
import Badge from 'primevue/badge'
import Button from 'primevue/button'
import AppLoader from '@/components/AppLoader.vue'
import OverlayHeader from '@/components/OverlayHeader.vue'
import OverlayRail from './components/OverlayRail.vue'
import AppLogo from '@/components/AppLogo.vue'
import WordCard from './components/WordCard.vue'
import WordListPanel from '@/components/WordListPanel.vue'
import { useDifficultWords } from '@/composables/useDifficultWords'
import { useDictionary } from '@/composables/useDictionary'
import { useAreaSelectors } from '@/composables/useAreaSelectors'
import { useHighlightHover } from '@/composables/useHighlightHover'
import { useIgnoredWords } from '@/composables/useIgnoredWords'
import { useOverlayDock } from '@/composables/useOverlayDock'
import { type SelectionMode, useReaderSettings } from '@/composables/useReaderSettings'
import { type SelectionAnchor, useTextSelection } from '@/composables/useTextSelection'
import { startAreaPicker } from '@/content-script/areaPicker'
import { isPanelOpen, publishPanelState, releasePanelCommandHandler, requestPanelOpen, setPanelCommandHandler } from '@/content-script/panelBridge'
import type { PanelCommand } from '@/utils/panelBus'
import { clearHighlights, hasOccurrence, highlightTerms, replaceTerms, restoreReplacement, revealTerm } from '@/utils/highlight'
import { type ImmersionMatch, isTargetLanguageText, pickImmersionWords } from '@/utils/immersion'
import { translateTerm } from '@/utils/translateTerm'
import { normalizeTerm } from '@/utils/dictionary'
import { extractReadableText } from '@/utils/pageText'
import { findSentence } from '@/utils/sentence'
import { dueInDays, reviewEntry } from '@/utils/srs'
import type { ImmersionWord, WordWithExplanation } from '@/types/words'

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
const { hasSelector, setSelector, clearSelector } = useAreaSelectors()
const { isCollapsed, width: dockWidth } = useOverlayDock()
const { anchor, clearSelection } = useTextSelection()
const { isIgnored, ignoreWord } = useIgnoredWords()
const { hint } = useHighlightHover()
const { settings: readerSettings, promise: readerSettingsLoaded } = useReaderSettings()

/** Сборка с боковой панелью браузера: док в страницу не рисуется, список слов живёт в панели */
const hasSidePanel = __HAS_SIDE_PANEL__

// state
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
/** Нормализованные термины, найденные в тексте страницы: у них в списке есть переход */
const onPageTerms = ref<string[]>([])

// computed
// скрытое слово убираем по живому списку, а не по снимку: строка должна пропасть сразу
const newWords = computed<WordWithExplanation[]>(() =>
  words.value.filter(
    (word) => !knownTerms.value.has(normalizeTerm(word.original)) && !isIgnored(word.original),
  ),
)
const hasArea = computed<boolean>(() => hasSelector(location.href))
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

/** Плоский вид вкраплений для списка: панели запись словаря целиком не нужна */
const immersionList = computed<ImmersionWord[]>(() =>
  immersionWords.value.map((match) => ({
    original: match.entry.original,
    translate: match.entry.translate,
    form: match.form,
    level: match.entry.level,
  })),
)

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
  // сразу после подсветки: раньше неё вхождений в DOM ещё нет
  onPageTerms.value = newWords.value
    .filter((word) => hasOccurrence(word.original))
    .map((word) => normalizeTerm(word.original))
}, { immediate: true })

// снимок для боковой панели: watchEffect сам подписан на всё, что входит в снимок
watchEffect(() => publishPanelState({
  isStarted: isStarted.value,
  isLoading: isLoading.value,
  isPicking: Boolean(cancelPicking.value),
  hasArea: hasArea.value,
  isImmersionActive: isImmersionActive.value,
  immersionWords: immersionList.value.map((word) => ({ ...word })),
  errorMessage: errorMessage.value,
  sourceText: sourceText.value,
  words: newWords.value.map((word) => ({ ...word })),
  onPage: onPageTerms.value.slice(),
  totalWords: words.value.length,
}))

/** Команды из боковой панели: всё, что трогает DOM страницы, выполняет оверлей */
function handlePanelCommand(command: PanelCommand): void {
  if (command.command === 'analyze') void analyze(command.full)
  if (command.command === 'reveal') revealTerm(command.term)
  if (command.command === 'resetArea') resetArea()

  if (command.command === 'pickArea') {
    // выбор запустили из панели — фокус остался в её документе, и Esc до страницы
    // не дойдёт. Просим фокус себе; браузер вправе отказать, поэтому Esc панель
    // слушает и у себя тоже
    window.focus()
    togglePicking()
  }
}

setPanelCommandHandler(handlePanelCommand)

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
  releasePanelCommandHandler(handlePanelCommand)
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
  clearSelector(location.href)
  if (isStarted.value) void analyze(true)
}

function togglePicking(): void {
  if (cancelPicking.value) {
    cancelPicking.value()
    return
  }

  // сворачиваемся в рельс, чтобы отдать выбираемому тексту всю ширину, и возвращаем
  // прежнее состояние: свернул пользователь сам — панель не должна раскрыться за него
  const wasCollapsed = isCollapsed.value
  isCollapsed.value = true

  cancelPicking.value = startAreaPicker((selector) => {
    cancelPicking.value = undefined
    isCollapsed.value = wasCollapsed

    if (!selector) return

    setSelector(location.href, selector)
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
 * Справа отсчёт идёт от края текста, а не окна: панель занимает свою полосу.
 */
function clampX(x: number): string {
  return `clamp(152px, ${x}px, calc(100vw - ${152 + dockWidth.value}px))`
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
        <!-- спиннер PrimeVue — иконочный шрифт, которого в оверлее нет: рисуем свой -->
        <AppLoader
          v-if="selectionStage === 'loading'"
          variant="swap"
          :size="18"
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
              fill="currentColor"
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

  <!-- Chrome: дока в странице нет, панель открывает ярлык-закладка вплотную к правому
       краю — sidePanel.open требует жеста пользователя. Прижат к краю, а не плавает,
       чтобы не накрывать виджеты сайтов; пока панель открыта, её порт жив и ярлык спрятан -->
  <button
    v-if="hasSidePanel && !isPanelOpen"
    type="button"
    class="fixed! right-0 top-1/2 flex -translate-y-[calc(50%+20px)] cursor-pointer flex-col
           items-center gap-1.5 rounded-l-lg border border-r-0 border-line bg-surface px-1.5
           py-2.5 text-content shadow-[-10px_0_24px_-6px_rgba(0,0,0,.35),-3px_0_8px_-4px_rgba(0,0,0,.3)]
           hover:bg-surface-hover hover:shadow-[-12px_0_28px_-6px_rgba(0,0,0,.45),-3px_0_10px_-4px_rgba(0,0,0,.35)]"
    :aria-label="t('popup.openPanel')"
    :data-hint="t('popup.openPanel')"
    @click="requestPanelOpen"
  >
    <AppLoader
      v-if="isLoading"
      :size="16"
      class="text-muted"
    />
    <AppLogo
      v-else
      :size="16"
    />
    <Badge
      v-if="!isLoading && newWords.length"
      :value="String(newWords.length)"
      severity="info"
      :aria-label="t('overlay.wordsFound')"
    />
  </button>

  <!-- панель прижата к краю на всю высоту: ровно на её ширину ужата и сама страница.
       Со сборкой под боковую панель браузера список слов рисует она, дока нет вовсе -->
  <section
    v-if="!hasSidePanel"
    class="fixed inset-y-0 right-0 flex flex-col border-l border-line bg-surface text-content
           shadow-[-8px_0_28px_-16px_rgba(0,0,0,.45)]"
    :style="{ width: `${dockWidth}px` }"
    aria-label="Erudit"
  >
    <OverlayRail
      v-if="isCollapsed"
      :words-count="newWords.length"
      :is-loading="isLoading"
      :is-started="isStarted"
      :is-picking="Boolean(cancelPicking)"
      @expand="isCollapsed = false"
      @reread="analyze(true)"
      @cancel-picking="togglePicking"
    />

    <header
      v-else
      class="border-b border-line px-3 py-2.5"
    >
      <OverlayHeader
        :words-count="newWords.length"
        :is-loading="isLoading"
        :is-picking="Boolean(cancelPicking)"
        :has-area="hasArea"
        :is-started="isStarted"
        :is-immersion="readerSettings.immersion"
        is-docked
        @collapse="isCollapsed = true"
        @pick-area="togglePicking"
        @reset-area="resetArea"
        @reread="analyze(true)"
        @toggle-immersion="readerSettings.immersion = !readerSettings.immersion"
        @close="emit('close')"
      />
    </header>

    <WordListPanel
      v-if="!isCollapsed"
      class="flex-1 overflow-y-auto p-3"
      :is-started="isStarted"
      :is-loading="isLoading"
      :is-picking="Boolean(cancelPicking)"
      :is-immersion-active="isImmersionActive"
      :immersion-words="immersionList"
      :error-message="errorMessage"
      :words="newWords"
      :on-page="onPageTerms"
      :total-words="words.length"
      :source-text="sourceText"
      @analyze="analyze()"
      @add="addToDictionary"
      @add-all="addAll"
      @ignore="ignoreWord"
      @reveal="revealTerm"
    />
  </section>
</template>
