<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { LoaderCircle } from 'lucide-vue-next'
import type { LookupResult, LookupSense } from '@/types/lookup'
import type { CefrLevel } from '@/types/words'
import { YANDEX_DICT_URL, lookupTerm } from '@/utils/dictClient'

const props = defineProps<{
  term: string
  translate?: string
  level?: CefrLevel
  /** Строка под переводом: где слово встретилось или когда его повторять */
  note?: string
  /** Пока идёт перевод выделенного: показываем слово, а вместо перевода — многоточие */
  isLoading?: boolean
}>()

/**
 * Толкование и транскрипция — не сразу: курсор проходит по подсвеченным словам
 * мимоходом, и запрос на каждое из них словари не оценят. Ответы кэширует
 * `dictClient`, так что повторное наведение обходится без сети.
 */
const LOOKUP_DELAY_MS = 400

// не влезает в тултип и повторяет то, что уже сказано переводом
const MAX_SENSES = 2

// composables
const { t } = useI18n()

// state
const lookup = ref<LookupResult | undefined>(undefined)
let timer: ReturnType<typeof setTimeout> | undefined

// watchers
watch(() => props.term, schedule, { immediate: true })

// lifecycle
onUnmounted((): void => clearTimeout(timer))

// методы
function schedule(term: string): void {
  clearTimeout(timer)
  lookup.value = undefined

  timer = setTimeout(async (): Promise<void> => {
    const { results } = await lookupTerm(term)
    // слово под курсором успело смениться, пока ходили в словарь
    if (term !== props.term) return

    // толкование информативнее второго списка переводов: перевод уже показан выше
    lookup.value = results.find((result) => result.source === 'free') ?? results[0]
  }, LOOKUP_DELAY_MS)
}

function senseText(sense: LookupSense): string {
  return sense.definition ?? sense.translations?.join(', ') ?? ''
}
</script>

<template>
  <div
    class="flex max-w-72 flex-col gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2.5
              text-sm text-content shadow-[0_10px_32px_-8px_rgba(0,0,0,.35)]"
  >
    <p class="m-0 flex flex-wrap items-center gap-x-2 gap-y-1">
      <span class="font-semibold">{{ term }}</span>
      <span
        v-if="level"
        class="rounded-full border border-line px-1.5 py-0.5 text-[11px] font-medium text-muted"
      >
        {{ level }}
      </span>
      <span
        v-if="lookup?.transcription"
        class="text-xs text-muted"
      >
        [{{ lookup.transcription }}]
      </span>
    </p>

    <p class="m-0 flex items-center gap-2">
      <LoaderCircle
        v-if="isLoading"
        :size="14"
        class="shrink-0 animate-spin"
      />
      {{ isLoading ? t('overlay.translating') : translate }}
    </p>

    <ul
      v-if="lookup"
      class="m-0 flex list-none flex-col gap-0.5 p-0 text-xs text-muted"
    >
      <li
        v-for="(sense, index) in lookup.senses.slice(0, MAX_SENSES)"
        :key="index"
      >
        <span
          v-if="sense.partOfSpeech"
          class="italic"
        >{{ sense.partOfSpeech }}: </span>
        <span>{{ senseText(sense) }}</span>
        <span v-if="sense.example"> — {{ sense.example }}</span>
      </li>
    </ul>

    <!-- атрибуция с активной ссылкой — требование условий Яндекс.Словаря -->
    <a
      v-if="lookup?.source === 'yandex'"
      :href="YANDEX_DICT_URL"
      target="_blank"
      rel="noreferrer noopener"
      class="text-xs text-muted underline underline-offset-2"
    >
      {{ t('lookup.yandexAttribution') }}
    </a>

    <p
      v-if="note"
      class="m-0 text-xs text-muted"
    >
      {{ note }}
    </p>

    <slot />
  </div>
</template>
