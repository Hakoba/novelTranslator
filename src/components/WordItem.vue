<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { BookmarkCheck, BookmarkPlus, Crosshair, EyeOff } from 'lucide-vue-next'
import Button from 'primevue/button'
import AppLoader from '@/components/AppLoader.vue'
import LookupPanel from '@/components/LookupPanel.vue'
import type { WordWithExplanation } from '@/types/words'
import { useDictionary } from '@/composables/useDictionary'
import { requestExplanation } from '@/utils/llmClient'
import { hintAttrs } from '@/utils/hint'

const props = defineProps<{
  word: WordWithExplanation
  sourceText: string
  /**
   * Есть ли к чему вести: модель иногда отвечает начальной формой, которой в тексте
   * нет. Считает родитель по подсветке — из боковой панели страницу не видно.
   */
  isOnPage: boolean
}>()

const emit = defineEmits<{
  (e: 'addToDictionary', word: WordWithExplanation): void
  (e: 'ignore'): void
  (e: 'reveal'): void
}>()

// composables
const { t } = useI18n()
const { hasEntry } = useDictionary()

// state
const isTipsOpen = ref<boolean>(false)
const isExplanationLoading = ref<boolean>(false)
const explanation = ref<string | undefined>(props.word.explanation)

// computed
const tipsId = computed<string>(
  () => `nt-tips-${props.word.original.replace(/[^a-zA-Z0-9_-]+/g, '-')}`,
)
const isSaved = computed<boolean>(() => hasEntry(props.word.original))

// методы
/** Пояснение модели — отдельной кнопкой: раскрытие карточки должно оставаться бесплатным */
async function loadExplanation(): Promise<void> {
  if (explanation.value || isExplanationLoading.value) return

  isExplanationLoading.value = true

  try {
    const text = await requestExplanation(props.word.original, props.sourceText)
    explanation.value = text || t('overlay.explanationFailed')
  } catch {
    explanation.value = t('overlay.explanationFailed')
  } finally {
    isExplanationLoading.value = false
  }
}

function addToDictionary(): void {
  // пояснение могли раскрыть уже после разбора — сохраняем то, что есть сейчас
  emit('addToDictionary', { ...props.word, explanation: explanation.value })
}
</script>

<template>
  <!-- фон, а не только рамка: на тёмной теме граница почти сливается с панелью -->
  <li class="flex flex-col gap-0.5 rounded-lg border border-line bg-surface-hover px-3 py-2.5">
    <div class="flex items-start gap-2">
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <p class="m-0 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <!-- слово-кнопка ведёт к тексту; когда вести некуда, остаётся обычной подписью -->
          <button
            v-if="isOnPage"
            type="button"
            class="cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-[length:inherit]
                   font-semibold text-content underline decoration-dotted underline-offset-4"
            v-bind="hintAttrs(t('overlay.revealHint'))"
            @click="emit('reveal')"
          >
            {{ word.original }}
          </button>
          <span
            v-else
            class="font-semibold"
          >{{ word.original }}</span>
          <span class="text-muted">{{ word.translate }}</span>
          <span
            v-if="word.level"
            class="rounded bg-surface px-1.5 py-0.5 text-[11px] font-medium text-muted"
          >
            {{ word.level }}
          </span>
        </p>

        <div class="-mx-2">
          <Button
            size="small"
            severity="secondary"
            text
            :label="t(isTipsOpen ? 'common.hide' : 'common.more')"
            :aria-expanded="isTipsOpen"
            :aria-controls="tipsId"
            @click="isTipsOpen = !isTipsOpen"
          />
        </div>
      </div>

      <div class="flex shrink-0 gap-0.5">
        <Button
          v-if="isOnPage"
          size="small"
          severity="secondary"
          text
          rounded
          v-bind="hintAttrs(t('overlay.revealHint'))"
          :aria-label="t('overlay.reveal')"
          @click="emit('reveal')"
        >
          <Crosshair :size="16" />
        </Button>

        <Button
          size="small"
          severity="secondary"
          text
          rounded
          v-bind="hintAttrs(t('overlay.ignoreHint'))"
          :aria-label="t('overlay.ignore')"
          @click="emit('ignore')"
        >
          <EyeOff :size="16" />
        </Button>

        <!-- главное действие строки: пока слово не сохранено — залитая кнопка,
             рядом с плоскими соседями её видно. Сохранённое гасим в зелёную галочку -->
        <Button
          size="small"
          :severity="isSaved ? 'success' : undefined"
          :text="isSaved"
          rounded
          :disabled="isSaved"
          :aria-label="t(isSaved ? 'overlay.alreadySaved' : 'overlay.addToDictionary')"
          @click="addToDictionary"
        >
          <BookmarkCheck
            v-if="isSaved"
            :size="16"
            fill="currentColor"
          />
          <BookmarkPlus
            v-else
            :size="16"
          />
        </Button>
      </div>
    </div>

    <!--
      Раскрытие идёт под строкой, а не в колонке рядом с кнопками: словарная статья
      узкая и без того, а панель браузера бывает уже 340 px — три кнопки отнимали
      у неё почти половину ширины.
    -->
    <div
      v-if="isTipsOpen"
      :id="tipsId"
      class="flex flex-col gap-2 border-l-2 border-line pl-3"
    >
      <!-- v-if, а не v-show: панель запрашивает словари при монтировании -->
      <LookupPanel :term="word.original" />

      <p
        v-if="explanation || isExplanationLoading"
        class="m-0 flex items-center gap-2 text-muted"
      >
        <AppLoader
          v-if="isExplanationLoading"
          :size="16"
        />
        {{ isExplanationLoading ? t('overlay.explanationLoading') : explanation }}
      </p>

      <div v-else>
        <Button
          size="small"
          severity="secondary"
          outlined
          :label="t('overlay.explanation')"
          @click="loadExplanation"
        />
      </div>
    </div>
  </li>
</template>
