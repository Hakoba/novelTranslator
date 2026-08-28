<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { BookmarkPlus } from 'lucide-vue-next'
import Button from 'primevue/button'
import WordItem from '@/components/WordItem.vue'
import type { WordWithExplanation } from '@/types/words'
import { normalizeTerm } from '@/utils/dictionary'

/** Содержимое панели слов — одно на док в оверлее и боковую панель браузера */
const props = defineProps<{
  isStarted: boolean
  isLoading: boolean
  isImmersionActive: boolean
  immersionCount: number
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

    <p
      v-else-if="isImmersionActive"
      class="m-0 text-muted"
    >
      {{ t('overlay.immersionActive', { count: immersionCount }) }}
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
