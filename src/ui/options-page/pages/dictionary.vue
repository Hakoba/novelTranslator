<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { BookA, Check, Download, Languages, Pencil, Plus, RotateCcw, Trash2, Upload, X } from 'lucide-vue-next'
import AppLoader from '@/components/AppLoader.vue'
import InlineSvg from '@/components/InlineSvg.vue'
import dictionaryArt from '@/assets/illustrations/dictionary.svg?raw'
import dictionaryEmptyArt from '@/assets/illustrations/dictionary-empty.svg?raw'
import noResultsArt from '@/assets/illustrations/no-results.svg?raw'
// путь до wasm даёт сборщик: в расширении относительные пути sql.js не находит
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import { parseApkg } from '@/utils/anki'
import LookupPanel from '@/components/LookupPanel.vue'
import { firstTranslation } from '@/utils/dict/parse'
import { lookupTerm } from '@/utils/dictClient'
import { unwrapSettled } from '@/utils/settled'
import { dictTranslate } from '@/utils/translateTerm'
import { useAnkiExport } from '@/composables/useAnkiExport'
import { useDictionary } from '@/composables/useDictionary'
import { useIgnoredWords } from '@/composables/useIgnoredWords'
import { CEFR_LEVELS, type CefrLevel, type DictionaryEntry } from '@/types/words'
import {
  EMPTY_FILTERS,
  chunk,
  levelFilterOptions,
  queryEntries,
  untranslatedEntries,
  type DictionaryFilters,
  type DictionarySort,
  type LevelOption,
} from '@/utils/dictionary'

const PAGE_SIZE = 20

/** Пачка запросов за раз: залпом на весь словарь бесключевые переводчики отвечают капчей */
const FILL_BATCH = 5

// composables
const { t } = useI18n()
const {
  entries,
  deletedEntries,
  addEntry,
  updateEntry,
  removeEntry,
  restoreEntry,
  purgeDeleted,
} = useDictionary()
const { ignored, restoreWord } = useIgnoredWords()
const { isExporting, exportError, exportToAnki } = useAnkiExport()

// state
const filters = ref<DictionaryFilters>({ ...EMPTY_FILTERS })
const sort = ref<DictionarySort>('newest')
const editingId = ref<string>('')
const editedTranslate = ref<string>('')
// раскрыта одна справка за раз: иначе список превращается в простыню
const lookupId = ref<string>('')
const isFormOpen = ref<boolean>(false)
const isSuggesting = ref<boolean>(false)
const fillState = ref<{ busy: boolean; done: number; total: number; message: string; failed: boolean }>({
  busy: false,
  done: 0,
  total: 0,
  message: '',
  failed: false,
})
const importState = ref<{ busy: boolean; message: string; failed: boolean }>({
  busy: false,
  message: '',
  failed: false,
})
const $file = ref<HTMLInputElement | undefined>(undefined)
const draft = ref<{ original: string; translate: string; level: CefrLevel | null }>({
  original: '',
  translate: '',
  level: null,
})

// computed
const visibleEntries = computed<DictionaryEntry[]>(() =>
  queryEntries(entries.value, filters.value, sort.value),
)
const levelOptions = computed<LevelOption[]>(() => levelFilterOptions(entries.value))
/** Слова, добавленные в словарь, пока источник перевода молчал */
const missing = computed<DictionaryEntry[]>(() => untranslatedEntries(entries.value))
const sortOptions = computed<{ label: string; value: DictionarySort }[]>(() => [
  { label: t('dictionary.sortNewest'), value: 'newest' },
  { label: t('dictionary.sortOldest'), value: 'oldest' },
  { label: t('dictionary.sortAlphabetical'), value: 'alphabetical' },
])
const isFilterActive = computed<boolean>(() =>
  Boolean(filters.value.search || filters.value.level || filters.value.onlyWithExplanation),
)
const isDraftValid = computed<boolean>(() =>
  Boolean(draft.value.original.trim() && draft.value.translate.trim()),
)

// методы
function resetFilters(): void {
  filters.value = { ...EMPTY_FILTERS }
}

function startEditing(entry: DictionaryEntry): void {
  editingId.value = entry.id
  editedTranslate.value = entry.translate
}

function saveEditing(): void {
  const translate = editedTranslate.value.trim()
  if (translate) updateEntry(editingId.value, { translate })
  editingId.value = ''
}

/**
 * Перевод для ручной формы берём только из словаря: модель здесь не зовём, чтобы
 * добавление слова оставалось бесплатным. `force` — явное нажатие кнопки поверх
 * уже введённого перевода, без него подставляем только в пустое поле.
 */
async function suggestTranslation(force = false): Promise<void> {
  const original = draft.value.original.trim()
  if (!original || isSuggesting.value) return
  if (!force && draft.value.translate.trim()) return

  isSuggesting.value = true

  try {
    const { results } = await lookupTerm(original)
    const translate = firstTranslation(results.find((result) => result.source === 'yandex'))
    if (translate) draft.value.translate = translate
  } finally {
    isSuggesting.value = false
  }
}

/**
 * Дозаполнить пустые переводы выбранным источником. Пачками, а не залпом; отказ
 * на одном слове остальных не отменяет, а общий отказ — например, кончившаяся
 * квота — приходит сообщением из `unwrapSettled`.
 */
async function fillTranslations(): Promise<void> {
  const list = missing.value
  if (!list.length || fillState.value.busy) return

  fillState.value = { busy: true, done: 0, total: list.length, message: '', failed: false }
  let filled = 0
  let error = ''

  for (const batch of chunk(list, FILL_BATCH)) {
    const settled = await Promise.allSettled(batch.map(async (item): Promise<boolean> => {
      const found = await dictTranslate(item.original)
      if (!found?.translate) return false

      updateEntry(item.id, { translate: found.translate })

      return true
    }))

    const outcome = unwrapSettled(settled, batch.map(() => false))
    filled += outcome.values.filter(Boolean).length
    fillState.value.done += batch.length
    if (outcome.error) {
      error = outcome.error
      break
    }
  }

  fillState.value = {
    busy: false,
    done: 0,
    total: 0,
    failed: Boolean(error),
    message: error || t('dictionary.fillDone', { filled, left: missing.value.length }),
  }
}

/** Ошибки разбора колоды приходят кодом: `anki.ts` не знает про интерфейс и его язык */
function importErrorMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : ''
  const known: Record<string, string> = {
    'anki-no-collection': 'errors.ankiNoCollection',
    'anki-zstd': 'errors.ankiZstd',
  }

  return known[code] ? t(known[code]) : code || t('dictionary.importFailed')
}

/** Дубли отсекает сам словарь: `addEntry` ищет запись по нормализованному слову */
async function importFromAnki(event: Event): Promise<void> {
  const input = event.target
  if (!(input instanceof HTMLInputElement)) return

  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  importState.value = { busy: true, message: '', failed: false }

  try {
    const known = new Set(entries.value.map((entry) => normalizeTerm(entry.original)))
    const notes = await parseApkg(new Uint8Array(await file.arrayBuffer()), {
      locateFile: () => sqlWasmUrl,
    })

    notes.forEach((note) => addEntry(note))
    const added = notes.filter((note) => !known.has(normalizeTerm(note.original))).length

    importState.value = {
      busy: false,
      failed: false,
      message: added
        ? t('dictionary.importAdded', { added, known: notes.length - added })
        : t('dictionary.importAllKnown', { count: notes.length }, notes.length),
    }
  } catch (error) {
    importState.value = {
      busy: false,
      failed: true,
      message: importErrorMessage(error),
    }
  }
}

function submitDraft(): void {
  if (!isDraftValid.value) return

  addEntry({
    original: draft.value.original.trim(),
    translate: draft.value.translate.trim(),
    level: draft.value.level ?? undefined,
  })

  draft.value = { original: '', translate: '', level: null }
  isFormOpen.value = false
}
</script>

<template>
  <Card>
    <template #title>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span>{{ t('dictionary.title') }}</span>
        <div class="flex flex-wrap gap-2">
          <Button
            v-if="missing.length || fillState.busy"
            size="small"
            severity="secondary"
            outlined
            :title="t('dictionary.fillHint')"
            :disabled="fillState.busy"
            :label="fillState.busy
              ? t('dictionary.fillBusy', { done: fillState.done, total: fillState.total })
              : t('dictionary.fill', { count: missing.length })"
            @click="fillTranslations"
          >
            <template #icon>
              <AppLoader
                v-if="fillState.busy"
                variant="swap"
                :size="16"
              />
              <Languages
                v-else
                :size="16"
              />
            </template>
          </Button>
          <Button
            v-if="entries.length"
            size="small"
            severity="secondary"
            outlined
            :title="t('dictionary.toAnkiHint')"
            :disabled="isExporting || !visibleEntries.length"
            :label="isExporting ? t('dictionary.toAnkiBusy') : t('dictionary.toAnki', { count: visibleEntries.length })"
            @click="exportToAnki(visibleEntries)"
          >
            <template #icon>
              <AppLoader
                v-if="isExporting"
                :size="16"
              />
              <Download
                v-else
                :size="16"
              />
            </template>
          </Button>
          <Button
            size="small"
            severity="secondary"
            outlined
            :title="t('dictionary.fromAnkiHint')"
            :disabled="importState.busy"
            :label="importState.busy ? t('dictionary.fromAnkiBusy') : t('dictionary.fromAnki')"
            @click="$file?.click()"
          >
            <template #icon>
              <AppLoader
                v-if="importState.busy"
                :size="16"
              />
              <Upload
                v-else
                :size="16"
              />
            </template>
          </Button>
          <input
            ref="$file"
            type="file"
            accept=".apkg"
            class="hidden"
            @change="importFromAnki"
          >
          <Button
            size="small"
            severity="secondary"
            :label="t(isFormOpen ? 'common.cancel' : 'dictionary.addWord')"
            @click="isFormOpen = !isFormOpen"
          >
            <template #icon>
              <Plus
                v-if="!isFormOpen"
                :size="16"
              />
              <X
                v-else
                :size="16"
              />
            </template>
          </Button>
        </div>
      </div>
    </template>

    <!-- эмблема стоит в подписи, а не в заголовке: там уже теснятся кнопки колоды -->
    <template #subtitle>
      <span class="flex items-center gap-3">
        <InlineSvg
          :markup="dictionaryArt"
          class="w-16 text-content"
        />
        {{ entries.length ? t('dictionary.saved', { count: entries.length }) : t('dictionary.empty') }}
      </span>
    </template>

    <template #content>
      <div class="flex flex-col gap-4 pt-2">
        <Message
          v-if="exportError"
          severity="error"
          :closable="false"
        >
          {{ exportError }}
        </Message>

        <Message
          v-if="fillState.message"
          :severity="fillState.failed ? 'error' : 'success'"
          :closable="false"
        >
          {{ fillState.message }}
        </Message>

        <Message
          v-if="importState.message"
          :severity="importState.failed ? 'error' : 'success'"
          :closable="false"
        >
          {{ importState.message }}
        </Message>

        <form
          v-if="isFormOpen"
          class="flex flex-col gap-3 rounded-md border border-line p-3"
          @submit.prevent="submitDraft"
        >
          <div class="flex flex-wrap gap-3">
            <div class="flex min-w-56 flex-1 flex-col gap-2">
              <label
                for="draft-original"
                class="text-muted"
              >
                {{ t('dictionary.draftOriginal') }}
              </label>
              <InputText
                id="draft-original"
                v-model="draft.original"
                autocomplete="off"
                :placeholder="t('dictionary.draftOriginalPlaceholder')"
                @blur="suggestTranslation()"
              />
            </div>

            <!-- кнопка стоит рядом с полем, а не в подписи: в подписи она сбивала
                 высоту шапки и поле перевода уезжало ниже соседних -->
            <div class="flex min-w-64 flex-1 flex-col gap-2">
              <label
                for="draft-translate"
                class="text-muted"
              >
                {{ t('dictionary.draftTranslate') }}
              </label>
              <div class="flex gap-2">
                <InputText
                  id="draft-translate"
                  v-model="draft.translate"
                  autocomplete="off"
                  :placeholder="t('dictionary.draftTranslatePlaceholder')"
                  class="min-w-0 flex-1"
                />
                <Button
                  severity="secondary"
                  outlined
                  class="shrink-0"
                  :title="t('dictionary.fromDictionaryHint')"
                  :disabled="!draft.original.trim() || isSuggesting"
                  :label="isSuggesting ? t('dictionary.fromDictionaryBusy') : t('dictionary.fromDictionary')"
                  @click="suggestTranslation(true)"
                >
                  <template #icon>
                    <AppLoader
                      v-if="isSuggesting"
                      variant="underline"
                      :size="18"
                    />
                    <BookA
                      v-else
                      :size="16"
                    />
                  </template>
                </Button>
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <label
                for="draft-level"
                class="text-muted"
              >
                {{ t('dictionary.draftLevel') }}
              </label>
              <Select
                id="draft-level"
                v-model="draft.level"
                :options="[...CEFR_LEVELS]"
                :placeholder="t('dictionary.draftLevelPlaceholder')"
                show-clear
                class="w-40"
              />
            </div>
          </div>

          <div class="flex items-center gap-3">
            <Button
              type="submit"
              :label="t('common.save')"
              :disabled="!isDraftValid"
            />
            <small class="text-muted">
              {{ t('dictionary.saveHint') }}
            </small>
          </div>
        </form>

        <div
          v-if="entries.length"
          class="flex flex-wrap items-center gap-3"
        >
          <InputText
            v-model="filters.search"
            class="min-w-48 flex-1"
            :placeholder="t('dictionary.search')"
            :aria-label="t('dictionary.searchLabel')"
          />

          <Select
            v-if="levelOptions.length"
            v-model="filters.level"
            :options="levelOptions"
            option-label="label"
            option-value="value"
            :placeholder="t('dictionary.anyLevel')"
            show-clear
            class="w-44"
            :aria-label="t('dictionary.levelFilter')"
          />

          <Select
            v-model="sort"
            :options="sortOptions"
            option-label="label"
            option-value="value"
            class="w-48"
            :aria-label="t('dictionary.sortLabel')"
          />

          <div class="flex items-center gap-2">
            <ToggleSwitch
              v-model="filters.onlyWithExplanation"
              input-id="only-explained"
            />
            <label for="only-explained">{{ t('dictionary.withExplanation') }}</label>
          </div>

          <Button
            v-if="isFilterActive"
            size="small"
            severity="secondary"
            text
            :label="t('common.reset')"
            @click="resetFilters"
          />
        </div>

        <div
          v-if="!entries.length"
          class="flex flex-col items-center gap-4 py-8 text-center"
        >
          <InlineSvg
            :markup="dictionaryEmptyArt"
            class="w-44 text-content"
          />
          <p class="m-0 max-w-sm text-muted">
            {{ t('dictionary.emptyHint') }}
          </p>
        </div>

        <!-- словарь не пуст, но фильтры ничего не оставили: это про фильтры, не про словарь -->
        <div
          v-else-if="!visibleEntries.length"
          class="flex flex-col items-center gap-4 py-8 text-center"
        >
          <InlineSvg
            :markup="noResultsArt"
            class="w-40 text-content"
          />
          <p class="m-0 max-w-sm text-muted">
            {{ t('dictionary.nothingFound') }}
          </p>
        </div>

        <DataView
          v-else
          :value="visibleEntries"
          :rows="PAGE_SIZE"
          :paginator="visibleEntries.length > PAGE_SIZE"
          data-key="id"
        >
          <template #list="{ items }">
            <ul class="m-0 flex list-none flex-col gap-2 p-0">
              <li
                v-for="entry in items"
                :key="entry.id"
                class="flex items-start gap-3 rounded-md border border-line px-3 py-2"
              >
                <div class="flex min-w-0 flex-1 flex-col gap-1">
                  <!-- уровень сразу после слова: в конце строки он отрывался
                       на отдельную строку у длинных переводов -->
                  <p class="m-0 flex flex-wrap items-baseline gap-x-2">
                    <span class="font-semibold">{{ entry.original }}</span>

                    <span
                      v-if="entry.level"
                      class="rounded border border-line px-1 text-xs text-muted"
                    >
                      {{ entry.level }}
                    </span>

                    <span
                      v-if="editingId !== entry.id"
                      class="text-muted"
                    >
                      — {{ entry.translate }}
                    </span>
                  </p>

                  <div
                    v-if="editingId === entry.id"
                    class="flex items-center gap-2"
                  >
                    <InputText
                      v-model="editedTranslate"
                      size="small"
                      class="flex-1"
                      :aria-label="t('dictionary.draftTranslate')"
                      @keyup.enter="saveEditing"
                      @keyup.esc="editingId = ''"
                    />
                    <Button
                      size="small"
                      severity="secondary"
                      text
                      rounded
                      :aria-label="t('dictionary.saveTranslate')"
                      @click="saveEditing"
                    >
                      <Check :size="16" />
                    </Button>
                    <Button
                      size="small"
                      severity="secondary"
                      text
                      rounded
                      :aria-label="t('common.cancel')"
                      @click="editingId = ''"
                    >
                      <X :size="16" />
                    </Button>
                  </div>

                  <p
                    v-if="entry.context"
                    class="m-0 border-l-2 border-line pl-3 text-sm text-muted italic"
                  >
                    {{ entry.context }}
                  </p>

                  <p
                    v-if="entry.explanation"
                    class="m-0 text-sm text-muted"
                  >
                    {{ entry.explanation }}
                  </p>

                  <!-- v-if, а не v-show: панель запрашивает словари при монтировании -->
                  <LookupPanel
                    v-if="lookupId === entry.id"
                    :term="entry.original"
                    class="mt-1 border-l-2 border-line pl-3 text-sm"
                  />
                </div>

                <div class="flex shrink-0 gap-1">
                  <Button
                    size="small"
                    severity="secondary"
                    text
                    rounded
                    :aria-label="t(lookupId === entry.id ? 'dictionary.lookupClose' : 'dictionary.lookupOpen')"
                    @click="lookupId = lookupId === entry.id ? '' : entry.id"
                  >
                    <BookA :size="16" />
                  </Button>
                  <Button
                    v-if="editingId !== entry.id"
                    size="small"
                    severity="secondary"
                    text
                    rounded
                    :aria-label="t('dictionary.editTranslate')"
                    @click="startEditing(entry)"
                  >
                    <Pencil :size="16" />
                  </Button>
                  <!-- красной корзина становится под курсором: в покое двадцать
                       красных иконок в столбик перетягивают на себя весь экран -->
                  <Button
                    size="small"
                    severity="secondary"
                    text
                    rounded
                    class="hover:!text-red-500"
                    :aria-label="t('dictionary.remove')"
                    @click="removeEntry(entry.id)"
                  >
                    <Trash2 :size="16" />
                  </Button>
                </div>
              </li>
            </ul>
          </template>
        </DataView>

        <!-- удаление мягкое: запись остаётся надгробием, отсюда её можно вернуть с прогрессом -->
        <div
          v-if="deletedEntries.length"
          class="flex flex-col gap-2 border-t border-line pt-4"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="m-0 text-muted">
              {{ t('dictionary.deletedTitle', { count: deletedEntries.length }) }}
            </p>
            <Button
              size="small"
              severity="danger"
              text
              :label="t('dictionary.deletedPurge')"
              :title="t('dictionary.deletedPurgeHint')"
              @click="purgeDeleted"
            >
              <template #icon>
                <Trash2 :size="14" />
              </template>
            </Button>
          </div>
          <ul class="m-0 flex list-none flex-col gap-1 p-0">
            <li
              v-for="entry in deletedEntries"
              :key="entry.id"
              class="flex items-center gap-2"
            >
              <Button
                size="small"
                severity="secondary"
                text
                rounded
                :aria-label="t('dictionary.deletedRestore', { term: entry.original })"
                :title="t('dictionary.deletedRestore', { term: entry.original })"
                @click="restoreEntry(entry.id)"
              >
                <RotateCcw :size="14" />
              </Button>
              <span class="min-w-0 truncate">
                <span class="font-medium">{{ entry.original }}</span>
                <span class="text-muted"> — {{ entry.translate }}</span>
              </span>
            </li>
          </ul>
        </div>

        <div
          v-if="ignored.length"
          class="flex flex-col gap-2 border-t border-line pt-4"
        >
          <p class="m-0 text-muted">
            {{ t('dictionary.ignoredTitle') }}
          </p>
          <ul class="m-0 flex list-none flex-wrap gap-2 p-0">
            <li
              v-for="term in ignored"
              :key="term"
            >
              <Button
                size="small"
                severity="secondary"
                outlined
                :label="term"
                :aria-label="t('dictionary.ignoredRestore', { term })"
                @click="restoreWord(term)"
              >
                <template #icon>
                  <RotateCcw :size="14" />
                </template>
              </Button>
            </li>
          </ul>
        </div>
      </div>
    </template>
  </Card>
</template>
