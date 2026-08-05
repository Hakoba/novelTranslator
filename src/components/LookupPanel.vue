<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { SOURCE_TITLES, type LookupResult } from '@/types/lookup'
import { lookupTerm } from '@/utils/dictClient'
import { dictionaryLinks, type DictLink } from '@/utils/dict/links'

const props = defineProps<{ term: string }>()

// state
const isLoading = ref<boolean>(true)
const results = ref<LookupResult[]>([])
const errorMessage = ref<string>('')

// ссылки готовы сразу: они не требуют запроса и остаются, даже если словари молчат
const links: DictLink[] = dictionaryLinks(props.term)

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
      class="m-0 text-muted"
    >
      Смотрю в словарях…
    </p>

    <template v-else>
      <section
        v-for="result in results"
        :key="result.source"
        class="flex flex-col gap-1"
      >
        <p class="m-0 flex flex-wrap items-baseline gap-2 text-xs text-muted">
          <span>{{ SOURCE_TITLES[result.source] }}</span>
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
        Словари ничего не нашли — попробуйте по ссылкам ниже.
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
  </div>
</template>
