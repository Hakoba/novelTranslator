<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'
import { Bot, GraduationCap, Languages, MessageSquareText, Monitor, MousePointerClick, ScanText } from 'lucide-vue-next'
import { PROMPT_EXTRA_LIMIT, SELECTION_MODES, WORD_ENGINES, useReaderSettings } from '@/composables/useReaderSettings'
import { LANGUAGES, UI_LANGUAGES } from '@/utils/languages'
import { PROFILE_LANG } from '@/utils/analyze'
import { CEFR_LEVELS } from '@/types/words'

const { t } = useI18n()
const { settings } = useReaderSettings()

const selectionOptions = computed<{ value: string; label: string }[]>(() =>
  SELECTION_MODES.map((mode) => ({ value: mode, label: t(`settings.analyze.selectionModes.${mode}`) })),
)

const engineOptions = computed<{ value: string; label: string }[]>(() =>
  WORD_ENGINES.map((engine) => ({ value: engine, label: t(`settings.analyze.engines.${engine}`) })),
)

/** Профиль CEFR собран только по английскому — на другом языке он не найдёт ничего */
const isProfileUseless = computed<boolean>(
  () => settings.value.engine === 'dictionary' && settings.value.sourceLang !== PROFILE_LANG,
)
</script>

<template>
  <Card>
    <template #title>
      <span class="flex items-center gap-2">
        <Languages :size="20" />
        {{ t('settings.language.title') }}
      </span>
    </template>
    <template #subtitle>
      {{ t('settings.language.subtitle') }}
    </template>
    <template #content>
      <!-- поля не растягиваем на всю карточку: строка длиннее ~80 символов уже плохо читается -->
      <div class="flex max-w-2xl flex-col gap-4 pt-2">
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-2">
            <label
              for="ui-lang"
              class="flex items-center gap-2 text-muted"
            >
              <Monitor :size="14" />
              {{ t('settings.language.ui') }}
            </label>
            <Select
              id="ui-lang"
              v-model="settings.uiLang"
              :options="UI_LANGUAGES"
              option-label="native"
              option-value="code"
              class="w-full"
            />
          </div>

          <div class="flex flex-col gap-2">
            <label
              for="reader-level"
              class="flex items-center gap-2 text-muted"
            >
              <GraduationCap :size="14" />
              {{ t('settings.language.level') }}
            </label>
            <Select
              id="reader-level"
              v-model="settings.level"
              :options="[...CEFR_LEVELS]"
              class="w-full"
            />
          </div>

          <div class="flex flex-col gap-2">
            <label
              for="source-lang"
              class="text-muted"
            >
              {{ t('settings.language.source') }}
            </label>
            <Select
              id="source-lang"
              v-model="settings.sourceLang"
              :options="LANGUAGES"
              option-label="native"
              option-value="code"
              class="w-full"
            />
          </div>

          <div class="flex flex-col gap-2">
            <label
              for="target-lang"
              class="text-muted"
            >
              {{ t('settings.language.target') }}
            </label>
            <Select
              id="target-lang"
              v-model="settings.targetLang"
              :options="LANGUAGES"
              option-label="native"
              option-value="code"
              class="w-full"
            />
          </div>
        </div>

        <small class="text-muted">
          {{ t('settings.language.hint') }}
        </small>
      </div>
    </template>
  </Card>

  <Card>
    <template #title>
      <span class="flex items-center gap-2">
        <ScanText :size="20" />
        {{ t('settings.analyze.title') }}
      </span>
    </template>
    <template #subtitle>
      {{ t('settings.analyze.subtitle') }}
    </template>
    <template #content>
      <div class="flex max-w-2xl flex-col gap-4 pt-2">
        <div class="flex flex-col gap-2">
          <label
            for="word-engine"
            class="flex items-center gap-2 text-muted"
          >
            <Bot :size="14" />
            {{ t('settings.analyze.engine') }}
          </label>
          <Select
            id="word-engine"
            v-model="settings.engine"
            :options="engineOptions"
            option-label="label"
            option-value="value"
            class="w-full sm:w-80"
          />
          <small class="text-muted">
            {{ t(`settings.analyze.engineHints.${settings.engine}`) }}
          </small>

          <Message
            v-if="isProfileUseless"
            severity="warn"
            size="small"
            variant="simple"
          >
            {{ t('settings.analyze.engineOnlyEnglish') }}
          </Message>
        </div>

        <div class="flex items-center gap-2 border-t border-line pt-4">
          <ToggleSwitch
            v-model="settings.autoAnalyze"
            input-id="auto-analyze"
          />
          <label for="auto-analyze">
            {{ t('settings.analyze.autoAnalyze') }}
          </label>
        </div>
        <small class="-mt-2 text-muted">
          {{ t('settings.analyze.autoAnalyzeHint') }}
        </small>

        <div class="flex items-center gap-2 border-t border-line pt-4">
          <ToggleSwitch
            v-model="settings.immersion"
            input-id="immersion"
          />
          <label for="immersion">
            {{ t('settings.analyze.immersion') }}
          </label>
        </div>
        <small class="-mt-2 text-muted">
          {{ t('settings.analyze.immersionHint') }}
        </small>

        <div class="flex flex-col gap-2 border-t border-line pt-4">
          <label
            for="selection-mode"
            class="flex items-center gap-2 text-muted"
          >
            <MousePointerClick :size="14" />
            {{ t('settings.analyze.selectionMode') }}
          </label>
          <Select
            id="selection-mode"
            v-model="settings.selectionMode"
            :options="selectionOptions"
            option-label="label"
            option-value="value"
            class="w-full sm:w-80"
          />
          <small class="text-muted">
            {{ t(`settings.analyze.selectionHints.${settings.selectionMode}`) }}
          </small>
        </div>

        <div class="flex flex-col gap-2 border-t border-line pt-4">
          <label
            for="prompt-extra"
            class="flex items-center gap-2 text-muted"
          >
            <MessageSquareText :size="14" />
            {{ t('settings.analyze.promptExtra') }}
          </label>
          <Textarea
            id="prompt-extra"
            v-model="settings.promptExtra"
            rows="3"
            auto-resize
            :maxlength="PROMPT_EXTRA_LIMIT"
            :placeholder="t('settings.analyze.promptExtraPlaceholder')"
          />
          <small class="text-muted">
            {{ t('settings.analyze.promptExtraHint', { left: PROMPT_EXTRA_LIMIT - settings.promptExtra.length }) }}
          </small>
        </div>
      </div>
    </template>
  </Card>
</template>
