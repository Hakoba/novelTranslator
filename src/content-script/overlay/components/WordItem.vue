<script setup lang="ts">
import { defineEmits, defineProps, computed, ref } from 'vue'
import type { WordWithExplanation } from '@/types/words'
import { requestExplanation } from '@/utils/llmClient'
import { extractReadableText } from '@/utils/pageText'
import Button from 'primevue/button'
import PlusIcon from '@primevue/icons/plus'
import Card from 'primevue/card'

const props = defineProps<{ word: WordWithExplanation }>()

const emit = defineEmits<{
  (e: 'addToDictionary', word: WordWithExplanation): void
}>()

// state
const isTipsOpen = ref<boolean>(false)
const isExplLoading = ref<boolean>(false)
const explanationValue = ref<string | undefined>(props.word.explanation)

// computed
const tipsId = computed<string>(() => `tips-${props.word.original.replace(/[^a-zA-Z0-9_-]+/g, '-')}`)

// methods
function handleAdd(): void {
  emit('addToDictionary', props.word)
}

async function handleToggleTips(): Promise<void> {
  const willOpen = !isTipsOpen.value
  if (willOpen && !explanationValue.value && !isExplLoading.value) {
    isExplLoading.value = true
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 15000)
      const context = extractReadableText()
      const expl = await requestExplanation(props.word.original, context, controller.signal)
      clearTimeout(timer)
      explanationValue.value = expl || 'Не удалось получить пояснение.'
    } catch {
      explanationValue.value = 'Не удалось получить пояснение.'
    } finally {
      isExplLoading.value = false
    }
  }
  isTipsOpen.value = willOpen
}
</script>

<template>
  <li class="list-none flex flex-nowrap items-start justify-between gap-3 rounded-md border px-3 py-2 shadow-sm">
    <div class="flex flex-col gap-2 min-w-0 flex-1">
      <div class="flex items-baseline gap-2 min-w-0">
        <span class="font-semibold truncate">{{ props.word.original }}</span>
        <span>—</span>
        <span class="truncate">{{ props.word.translate }}</span>
      </div>
      <div class="flex items-center gap-2">
        <Button
          type="button"
          :aria-expanded="isTipsOpen ? 'true' : 'false'"
          :aria-controls="tipsId"
          size="small"
          severity="secondary"
          text
          @click="handleToggleTips"
        >
          <template #default>
            Пояснение
          </template>
        </Button>
      </div>
      <Card
        v-show="isTipsOpen"
        :id="tipsId"
        class="mt-1 border shadow-sm"
      >
        <template #content>
          <p class="text-sm">
            <template v-if="isExplLoading">Загрузка…</template>
            <template v-else>{{ explanationValue || '—' }}</template>
          </p>
        </template>
      </Card>
    </div>
    <Button
      type="button"
      aria-label="Добавить в словарь"
      title="Добавить в словарь"
      size="small"
      severity="success"
      rounded
      class="shrink-0 self-start"
      @click="handleAdd"
    >
      <template #icon>
        <PlusIcon class="w-4 h-4" />
      </template>
    </Button>
  </li>
</template>

<style scoped>
</style>
