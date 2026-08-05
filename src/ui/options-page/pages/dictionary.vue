<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, Download, Pencil, Plus, Trash2, X } from 'lucide-vue-next'
import { useAnkiExport } from '@/composables/useAnkiExport'
import { useDictionary } from '@/composables/useDictionary'
import { CEFR_LEVELS, type CefrLevel, type DictionaryEntry } from '@/types/words'
import {
  EMPTY_FILTERS,
  collectLevels,
  queryEntries,
  type DictionaryFilters,
  type DictionarySort,
} from '@/utils/dictionary'

const PAGE_SIZE = 20

const SORT_OPTIONS: { label: string; value: DictionarySort }[] = [
  { label: 'Сначала новые', value: 'newest' },
  { label: 'Сначала старые', value: 'oldest' },
  { label: 'По алфавиту', value: 'alphabetical' },
]

// composables
const { entries, addEntry, updateEntry, removeEntry } = useDictionary()
const { isExporting, exportError, exportToAnki } = useAnkiExport()

// state
const filters = ref<DictionaryFilters>({ ...EMPTY_FILTERS })
const sort = ref<DictionarySort>('newest')
const editingId = ref<string>('')
const editedTranslate = ref<string>('')
const isFormOpen = ref<boolean>(false)
const draft = ref<{ original: string; translate: string; level: CefrLevel | null }>({
  original: '',
  translate: '',
  level: null,
})

// computed
const visibleEntries = computed<DictionaryEntry[]>(() =>
  queryEntries(entries.value, filters.value, sort.value),
)
const levelOptions = computed<CefrLevel[]>(() => collectLevels(entries.value))
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
        <span>Словарь</span>
        <div class="flex flex-wrap gap-2">
          <Button
            v-if="entries.length"
            size="small"
            severity="secondary"
            outlined
            :disabled="isExporting || !visibleEntries.length"
            :label="isExporting ? 'Собираю колоду…' : `В Anki — ${visibleEntries.length}`"
            @click="exportToAnki(visibleEntries)"
          >
            <template #icon>
              <Download :size="16" />
            </template>
          </Button>
          <Button
            size="small"
            severity="secondary"
            :label="isFormOpen ? 'Отмена' : 'Добавить слово'"
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

    <template #subtitle>
      {{ entries.length ? `Сохранено слов и фраз: ${entries.length}` : 'Пока пусто' }}
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

        <form
          v-if="isFormOpen"
          class="flex flex-col gap-3 rounded-md border border-line p-3"
          @submit.prevent="submitDraft"
        >
          <div class="flex flex-wrap gap-3">
            <div class="flex min-w-48 flex-1 flex-col gap-2">
              <label
                for="draft-original"
                class="text-muted"
              >
                Слово или фраза
              </label>
              <InputText
                id="draft-original"
                v-model="draft.original"
                autocomplete="off"
                placeholder="flash of light"
              />
            </div>

            <div class="flex min-w-48 flex-1 flex-col gap-2">
              <label
                for="draft-translate"
                class="text-muted"
              >
                Перевод
              </label>
              <InputText
                id="draft-translate"
                v-model="draft.translate"
                autocomplete="off"
                placeholder="вспышка света"
              />
            </div>

            <div class="flex flex-col gap-2">
              <label
                for="draft-level"
                class="text-muted"
              >
                Уровень
              </label>
              <Select
                id="draft-level"
                v-model="draft.level"
                :options="[...CEFR_LEVELS]"
                placeholder="не указан"
                show-clear
                class="w-32"
              />
            </div>
          </div>

          <div>
            <Button
              type="submit"
              size="small"
              label="Сохранить"
              :disabled="!isDraftValid"
            />
          </div>
        </form>

        <div
          v-if="entries.length"
          class="flex flex-wrap items-center gap-3"
        >
          <InputText
            v-model="filters.search"
            class="min-w-48 flex-1"
            placeholder="Поиск по слову, переводу, пояснению"
            aria-label="Поиск по словарю"
          />

          <Select
            v-if="levelOptions.length"
            v-model="filters.level"
            :options="levelOptions"
            placeholder="Любой уровень"
            show-clear
            class="w-44"
            aria-label="Фильтр по уровню"
          />

          <Select
            v-model="sort"
            :options="SORT_OPTIONS"
            option-label="label"
            option-value="value"
            class="w-48"
            aria-label="Сортировка"
          />

          <div class="flex items-center gap-2">
            <ToggleSwitch
              v-model="filters.onlyWithExplanation"
              input-id="only-explained"
            />
            <label for="only-explained">С пояснением</label>
          </div>

          <Button
            v-if="isFilterActive"
            size="small"
            severity="secondary"
            text
            label="Сбросить"
            @click="resetFilters"
          />
        </div>

        <p
          v-if="!entries.length"
          class="m-0 text-muted"
        >
          Слова попадают сюда из оверлея на странице: кнопка-закладка рядом со словом
          или выделение текста. Можно и добавить руками.
        </p>

        <p
          v-else-if="!visibleEntries.length"
          class="m-0 text-muted"
        >
          Под фильтры ничего не подошло.
        </p>

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
                  <p class="m-0 flex flex-wrap items-baseline gap-x-2">
                    <span class="font-semibold">{{ entry.original }}</span>

                    <span
                      v-if="editingId !== entry.id"
                      class="text-muted"
                    >
                      — {{ entry.translate }}
                    </span>

                    <span
                      v-if="entry.level"
                      class="rounded border border-line px-1 text-xs text-muted"
                    >
                      {{ entry.level }}
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
                      aria-label="Перевод"
                      @keyup.enter="saveEditing"
                      @keyup.esc="editingId = ''"
                    />
                    <Button
                      size="small"
                      severity="secondary"
                      text
                      rounded
                      aria-label="Сохранить перевод"
                      @click="saveEditing"
                    >
                      <Check :size="16" />
                    </Button>
                    <Button
                      size="small"
                      severity="secondary"
                      text
                      rounded
                      aria-label="Отменить"
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
                </div>

                <div class="flex shrink-0 gap-1">
                  <Button
                    v-if="editingId !== entry.id"
                    size="small"
                    severity="secondary"
                    text
                    rounded
                    aria-label="Изменить перевод"
                    @click="startEditing(entry)"
                  >
                    <Pencil :size="16" />
                  </Button>
                  <Button
                    size="small"
                    severity="danger"
                    text
                    rounded
                    aria-label="Удалить из словаря"
                    @click="removeEntry(entry.id)"
                  >
                    <Trash2 :size="16" />
                  </Button>
                </div>
              </li>
            </ul>
          </template>
        </DataView>
      </div>
    </template>
  </Card>
</template>
