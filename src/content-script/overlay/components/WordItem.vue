<script setup lang="ts">
import { computed, ref } from 'vue'
import { BookmarkCheck, BookmarkPlus } from 'lucide-vue-next'
import Button from 'primevue/button'
import type { WordWithExplanation } from '@/types/words'
import { useDictionary } from '@/composables/useDictionary'
import { requestExplanation } from '@/utils/llmClient'

const props = defineProps<{ word: WordWithExplanation; sourceText: string }>()

const emit = defineEmits<{
  (e: 'addToDictionary', word: WordWithExplanation): void
}>()

// composables
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
async function toggleTips(): Promise<void> {
  isTipsOpen.value = !isTipsOpen.value

  if (!isTipsOpen.value || explanation.value || isExplanationLoading.value) return

  isExplanationLoading.value = true

  try {
    const text = await requestExplanation(props.word.original, props.sourceText)
    explanation.value = text || 'Не удалось получить пояснение.'
  } catch {
    explanation.value = 'Не удалось получить пояснение.'
  } finally {
    isExplanationLoading.value = false
  }
}

function addToDictionary(): void {
  // пояснение могли раскрыть уже после разбора главы — сохраняем то, что есть сейчас
  emit('addToDictionary', { ...props.word, explanation: explanation.value })
}
</script>

<template>
  <li class="flex items-start gap-3 rounded-md border border-line px-3 py-2">
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <p class="m-0 flex flex-wrap items-baseline gap-x-2">
        <span class="font-semibold">{{ word.original }}</span>
        <span class="text-muted">— {{ word.translate }}</span>
        <span
          v-if="word.level"
          class="rounded border border-line px-1 text-xs text-muted"
        >
          {{ word.level }}
        </span>
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
        class="m-0 border-l-2 border-line pl-3 text-muted"
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
      :disabled="isSaved"
      :aria-label="isSaved ? 'Уже в словаре' : 'Добавить в словарь'"
      @click="addToDictionary"
    >
      <BookmarkCheck
        v-if="isSaved"
        :size="16"
      />
      <BookmarkPlus
        v-else
        :size="16"
      />
    </Button>
  </li>
</template>
