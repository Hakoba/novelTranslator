<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { BookmarkPlus, Crosshair } from 'lucide-vue-next'
import Button from 'primevue/button'
import WordItem from '@/components/WordItem.vue'
import type { ImmersionWord, WordWithExplanation } from '@/types/words'
import { normalizeTerm } from '@/utils/dictionary'
import { hintAttrs } from '@/utils/hint'

/** Содержимое панели слов — одно на док в оверлее и боковую панель браузера */
const props = defineProps<{
  isStarted: boolean
  isLoading: boolean
  isImmersionActive: boolean
  /** Вкраплённые в страницу слова словаря — списком, чтобы каждое можно было найти в тексте */
  immersionWords: ImmersionWord[]
  errorMessage: string
  /** Найденные слова уже без сохранённых и скрытых */
  words: WordWithExplanation[]
  /** Нормализованные термины, найденные в тексте страницы: у них есть кнопка перехода */
  onPage: string[]
  /** Сколько нашлось до фильтра: различает «всё знакомо» и «ничего не нашлось» */
  totalWords: number
  sourceText: string
}>()

const emit = defineEmits<{
  (e: 'analyze'): void
  (e: 'add', word: WordWithExplanation): void
  (e: 'addAll'): void
  (e: 'ignore', term: string): void
  (e: 'reveal', term: string): void
}>()

const { t } = useI18n()

// по букве в span — иначе волну не сдвинуть по фазе; пробел неразрывный, обычный схлопнется
const loadingChars = computed<string[]>(() =>
  [...t('overlay.analyzing')].map((char) => char === ' ' ? '\u00a0' : char),
)

function isOnPage(word: WordWithExplanation): boolean {
  return props.onPage.includes(normalizeTerm(word.original))
}
</script>

<template>
  <div>
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
        @click="emit('analyze')"
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

    <!-- вкрапления: слово подменило собой текст, и найти его глазами трудно —
         поэтому список с переходом к каждому, как у обычных найденных слов -->
    <div
      v-else-if="isImmersionActive"
      class="flex flex-col gap-2"
    >
      <p class="m-0 text-muted">
        {{ t('overlay.immersionActive', { count: immersionWords.length }) }}
      </p>

      <ul
        v-if="immersionWords.length"
        class="m-0 flex list-none flex-col gap-1.5 p-0"
      >
        <li
          v-for="word in immersionWords"
          :key="word.original"
          class="flex items-start gap-2 rounded-lg border border-line bg-surface-hover px-3 py-2.5"
        >
          <div class="flex min-w-0 flex-1 flex-col gap-0.5">
            <p class="m-0 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <!-- зелёный кружок — тот же цвет, которым слово помечено в тексте -->
              <span
                class="size-2 shrink-0 rounded-full bg-mark-saved"
                aria-hidden="true"
              />
              <span class="font-semibold">{{ word.original }}</span>
              <span class="text-muted">{{ word.translate }}</span>
              <span
                v-if="word.level"
                class="rounded bg-surface px-1.5 py-0.5 text-[11px] font-medium text-muted"
              >
                {{ word.level }}
              </span>
            </p>
            <p class="m-0 text-sm text-muted">
              {{ t('overlay.immersionOriginal', { form: word.form }) }}
            </p>
          </div>

          <Button
            size="small"
            severity="secondary"
            text
            rounded
            v-bind="hintAttrs(t('overlay.revealHint'))"
            :aria-label="t('overlay.reveal')"
            @click="emit('reveal', word.original)"
          >
            <Crosshair :size="16" />
          </Button>
        </li>
      </ul>
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
        :label="t('common.retry')"
        @click="emit('analyze')"
      />
    </div>

    <div
      v-else-if="words.length"
      class="flex flex-col gap-2"
    >
      <!-- на одно слово кнопка не нужна: рядом с ним и так есть своя закладка -->
      <div v-if="words.length > 1">
        <Button
          size="small"
          severity="secondary"
          outlined
          :label="t('overlay.addAll', { count: words.length })"
          @click="emit('addAll')"
        >
          <template #icon>
            <BookmarkPlus :size="16" />
          </template>
        </Button>
      </div>

      <ul class="m-0 flex list-none flex-col gap-1.5 p-0">
        <WordItem
          v-for="word in words"
          :key="word.original"
          :word="word"
          :source-text="sourceText"
          :is-on-page="isOnPage(word)"
          @add-to-dictionary="emit('add', $event)"
          @ignore="emit('ignore', word.original)"
          @reveal="emit('reveal', word.original)"
        />
      </ul>
    </div>

    <p
      v-else
      class="m-0 text-muted"
    >
      {{ t(totalWords ? 'overlay.allKnown' : 'overlay.nothingFound') }}
    </p>
  </div>
</template>
