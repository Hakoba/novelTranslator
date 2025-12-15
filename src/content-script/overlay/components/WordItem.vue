<script setup lang="ts">
import { defineEmits, defineProps, computed, ref } from 'vue'
import type { WordWithExplanation } from '@/types/words'
import { requestExplanation } from '@/utils/llmClient'
import { extractReadableText } from '@/utils/pageText'

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
  <li class="nt-list-item">
    <div class="nt-word">
      <div class="nt-row">
        <span class="nt-word-original">{{ props.word.original }}</span>
        <span class="nt-sep">—</span>
        <span class="nt-word-translate">{{ props.word.translate }}</span>
      </div>
      <div class="nt-tips">
        <button
          type="button"
          class="nt-tip-btn"
          :aria-expanded="isTipsOpen ? 'true' : 'false'"
          :aria-controls="tipsId"
          @click="handleToggleTips"
        >
          Пояснение
        </button>
        <small
          v-show="isTipsOpen"
          :id="tipsId"
          class="nt-word-explanation"
        >
          <template v-if="isExplLoading">Загрузка…</template>
          <template v-else>{{ explanationValue || '—' }}</template>
        </small>
      </div>
    </div>
    <button
      type="button"
      class="nt-icon-btn nt-add-btn"
      aria-label="Добавить в словарь"
      title="Добавить в словарь"
      @click="handleAdd"
    >
      ➕
    </button>
  </li>
</template>

<style scoped>
.nt-row { display: inline-flex; align-items: baseline; gap: 0.5rem; flex-wrap: wrap; }
.nt-word-original { font-weight: 600; }
.nt-word-translate { color: #64748b; }
.nt-sep { opacity: 0.6; }
.nt-tips { margin-top: 0.25rem; display: grid; gap: 0.25rem; }
.nt-tip-btn { background: transparent; display: flex; border: 1px solid rgba(15,23,42,0.12); color: inherit; padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.8125rem; line-height: 1; cursor: pointer; }
.nt-tip-btn:hover { background: rgba(0,0,0,.04); }
.nt-add-btn { margin-left: auto; }
@media (prefers-color-scheme: dark) {
  .nt-word-translate { color: #94a3b8; }
  .nt-tip-btn { border-color: rgba(148,163,184,0.25); }
  .nt-tip-btn:hover { background: rgba(255,255,255,.06); }
}
</style>
