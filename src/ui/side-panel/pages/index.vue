<script setup lang="ts">
import OverlayHeader from '@/components/OverlayHeader.vue'
import WordListPanel from '@/components/WordListPanel.vue'
import PanelEmptyState from '@/ui/side-panel/components/PanelEmptyState.vue'
import { useDictionary } from '@/composables/useDictionary'
import { useIgnoredWords } from '@/composables/useIgnoredWords'
import { usePanelChannel } from '@/composables/usePanelChannel'
import { useReaderSettings } from '@/composables/useReaderSettings'
import { findSentence } from '@/utils/sentence'
import type { WordWithExplanation } from '@/types/words'

/**
 * Боковая панель рисует состояние разбора активной вкладки; связь с ней держит
 * `usePanelChannel`. Словарь и настройки — напрямую из storage, они реактивны
 * в обоих контекстах без сообщений.
 */
const { addEntry } = useDictionary()
const { ignoreWord } = useIgnoredWords()
const { settings: readerSettings } = useReaderSettings()
const { state, tabId, currentUrl, command, reloadTab } = usePanelChannel()

function addToDictionary(word: WordWithExplanation): void {
  addEntry({
    original: word.original,
    translate: word.translate,
    context: findSentence(state.value?.sourceText ?? '', word.original),
    explanation: word.explanation,
    level: word.level,
  })
}

/** Пояснения тут не будет: их подтягивает WordItem, а списком слов их никто не раскрывал */
function addAll(): void {
  state.value?.words.forEach(addToDictionary)
}
</script>

<template>
  <div
    v-if="state"
    class="flex h-dvh flex-col"
  >
    <header class="border-b border-line px-3 py-2.5">
      <OverlayHeader
        :words-count="state.words.length"
        :is-loading="state.isLoading"
        :is-picking="state.isPicking"
        :has-area="state.hasArea"
        :is-started="state.isStarted"
        :is-immersion="readerSettings.immersion"
        @pick-area="command({ command: 'pickArea' })"
        @reset-area="command({ command: 'resetArea' })"
        @reread="command({ command: 'analyze', full: true })"
        @toggle-immersion="readerSettings.immersion = !readerSettings.immersion"
      />
    </header>

    <WordListPanel
      class="flex-1 overflow-y-auto p-3"
      :is-started="state.isStarted"
      :is-loading="state.isLoading"
      :is-picking="state.isPicking"
      :is-immersion-active="state.isImmersionActive"
      :immersion-words="state.immersionWords"
      :error-message="state.errorMessage"
      :words="state.words"
      :on-page="state.onPage"
      :total-words="state.totalWords"
      :source-text="state.sourceText"
      @analyze="command({ command: 'analyze', full: false })"
      @add="addToDictionary"
      @add-all="addAll"
      @ignore="ignoreWord"
      @reveal="(term) => command({ command: 'reveal', term })"
    />
  </div>

  <PanelEmptyState
    v-else
    :current-url="currentUrl"
    :can-reload="tabId !== undefined"
    @reload="reloadTab"
  />
</template>
