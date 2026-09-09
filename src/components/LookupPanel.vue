<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppLoader from '@/components/AppLoader.vue'
import type { LookupResult, LookupSource } from '@/types/lookup'
import { useReaderSettings } from '@/composables/useReaderSettings'
import { YANDEX_DICT_URL, lookupTerm } from '@/utils/dictClient'
import { dictionaryLinks, type DictLink } from '@/utils/dict/links'

const props = defineProps<{ term: string }>()

const SOURCE_LABEL: Record<LookupSource, string> = {
  yandex: 'lookup.sourceYandex',
  free: 'lookup.sourceFree',
  machine: 'lookup.sourceMachine',
}

// composables
const { t } = useI18n()
const { settings } = useReaderSettings()

// state
const isLoading = ref<boolean>(true)
const results = ref<LookupResult[]>([])
const errorMessage = ref<string>('')

// ссылки не требуют запроса и остаются, даже если словари молчат; computed —
// потому что языковая пара приезжает из storage уже после первой отрисовки
const links = computed<DictLink[]>(() =>
  dictionaryLinks(props.term, {
    source: settings.value.sourceLang,
    target: settings.value.targetLang,
  }),
)

// lifecycle
onMounted(async (): Promise<void> => {
  const outcome = await lookupTerm(props.term)
  results.value = outcome.results
  errorMessage.value = outcome.error ?? ''
  isLoading.value = false
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <p
      v-if="isLoading"
      class="m-0 flex items-center gap-2 text-muted"
    >
      <AppLoader
        variant="underline"
        :size="18"
      />
      {{ t('lookup.loading') }}
    </p>

    <template v-else>
      <section
        v-for="result in results"
        :key="result.source"
        class="flex flex-col gap-1"
      >
        <p class="m-0 flex flex-wrap items-baseline gap-2 text-xs text-muted">
          <span>{{ t(SOURCE_LABEL[result.source]) }}</span>
          <span v-if="result.transcription">[{{ result.transcription }}]</span>
        </p>

        <ul class="m-0 flex list-none flex-col gap-1 p-0">
          <li
            v-for="(sense, index) in result.senses"
            :key="index"
          >
            <span
              v-if="sense.partOfSpeech"
              class="text-muted italic"
            >
              {{ sense.partOfSpeech }}:
            </span>
            <span>{{ sense.translations?.join(', ') || sense.definition }}</span>
            <span
              v-if="sense.example"
              class="text-muted"
            >
              — {{ sense.example }}
            </span>
          </li>
        </ul>
      </section>

      <p
        v-if="errorMessage"
        class="m-0 text-muted"
      >
        {{ errorMessage }}
      </p>

      <p
        v-else-if="!results.length"
        class="m-0 text-muted"
      >
        {{ t('lookup.nothing') }}
      </p>
    </template>

    <nav class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <a
        v-for="link in links"
        :key="link.id"
        :href="link.url"
        target="_blank"
        rel="noreferrer noopener"
        class="text-muted underline underline-offset-2"
      >
        {{ link.title }}
      </a>
    </nav>

    <!-- условия Яндекс.Словаря требуют этой подписи с активной ссылкой везде, где показаны его данные -->
    <a
      v-if="results.some((result) => result.source === 'yandex')"
      :href="YANDEX_DICT_URL"
      target="_blank"
      rel="noreferrer noopener"
      class="text-xs text-muted underline underline-offset-2"
    >
      {{ t('lookup.yandexAttribution') }}
    </a>
  </div>
</template>
