<script setup lang="ts">
import { computed, ref } from 'vue'
import { BookmarkPlus } from 'lucide-vue-next'
import Button from 'primevue/button'
import type { WordWithExplanation } from '@/types/words'
import { requestExplanation } from '@/utils/llmClient'
import { extractReadableText } from '@/utils/pageText'

const props = defineProps<{ word: WordWithExplanation }>()

const emit = defineEmits<{
  (e: 'addToDictionary', word: WordWithExplanation): void
}>()

// state
const isTipsOpen = ref<boolean>(false)
const isExplanationLoading = ref<boolean>(false)
const explanation = ref<string | undefined>(props.word.explanation)

// computed
const tipsId = computed<string>(
  () => `nt-tips-${props.word.original.replace(/[^a-zA-Z0-9_-]+/g, '-')}`,
)

// методы
async function toggleTips(): Promise<void> {
  isTipsOpen.value = !isTipsOpen.value

  if (!isTipsOpen.value || explanation.value || isExplanationLoading.value) return

  isExplanationLoading.value = true
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)

  try {
    const text = await requestExplanation(
      props.word.original,
      extractReadableText(),
      controller.signal,
    )
    explanation.value = text || 'Не удалось получить пояснение.'
  } catch {
    explanation.value = 'Не удалось получить пояснение.'
  } finally {
    clearTimeout(timer)
    isExplanationLoading.value = false
  }
}
</script>

<template>
  <li class="flex items-start gap-3 rounded-md border border-line px-3 py-2">
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <p class="m-0 flex flex-wrap items-baseline gap-x-2">
        <span class="font-semibold">{{ word.original }}</span>
        <span class="text-muted">— {{ word.translate }}</span>
      </p>

      <div>
        <Button
          size="small"
          severity="secondary"
          text
          :label="isTipsOpen ? 'Скрыть пояснение' : 'Пояснение'"
          :aria-expanded="isTipsOpen"
          :aria-controls="tipsId"
          @click="toggleTips"
        />
      </div>

      <p
        v-show="isTipsOpen"
        :id="tipsId"
        class="m-0 rounded-md bg-black/5 px-3 py-2 dark:bg-white/10"
      >
        {{ isExplanationLoading ? 'Загрузка…' : explanation || '—' }}
      </p>
    </div>

    <Button
      size="small"
      severity="success"
      text
      rounded
      class="shrink-0"
      aria-label="Добавить в словарь"
      @click="emit('addToDictionary', word)"
    >
      <BookmarkPlus :size="16" />
    </Button>
  </li>
</template>
