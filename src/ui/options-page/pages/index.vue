<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AccessSites from '@/components/accessSites.vue'
import {
  HAS_DEV_YANDEX_CREDENTIALS,
  LOCAL_PRESET,
  OPENAI_COMPATIBLE_PRESETS,
  YANDEX_PRESET,
  presetForProvider,
  useLlmSettings,
} from '@/composables/useLlmSettings'
import { PROVIDER_LIST, getProvider, type ProviderId } from '@/utils/llm/providers'
import { TRANSLATOR_LIST } from '@/utils/mt/translators'
import { PROMPT_EXTRA_LIMIT, useReaderSettings } from '@/composables/useReaderSettings'
import { YANDEX_DICT_KEY_URL, useDictSettings } from '@/composables/useDictSettings'
import { LANGUAGES } from '@/utils/languages'
import { UI_LANGUAGES } from '@/utils/i18n'
import { CEFR_LEVELS } from '@/types/words'

const { t } = useI18n()
const { settings } = useLlmSettings()
const { settings: readerSettings } = useReaderSettings()
const { settings: dictSettings } = useDictSettings()

// computed
const providerKeyUrl = computed<string | undefined>(() => getProvider(settings.value.provider).keyUrl)
// названия видов API живут в локалях: «OpenAI-совместимый» на английском звучит иначе
const providerOptions = computed<{ id: string; title: string }[]>(() =>
  PROVIDER_LIST.map(({ id }) => ({ id, title: t(`settings.model.providers.${id}`) })),
)
const translatorOptions = computed<{ id: string; title: string }[]>(() => [
  { id: 'none', title: t('settings.dictionaries.translatorNone') },
  ...TRANSLATOR_LIST.map(({ id, title }) => ({ id, title })),
])

// методы
/** Смена вида API тянет адрес и модель: прежние в новом протоколе не работают */
function applyProvider(id: ProviderId): void {
  settings.value = presetForProvider(id)
}

function applyCompatiblePreset(preset: { baseUrl: string; model: string }): void {
  settings.value = {
    ...settings.value,
    provider: 'openai',
    baseUrl: preset.baseUrl,
    model: preset.model,
  }
}

function applyLocalPreset(): void {
  settings.value = { ...LOCAL_PRESET }
}

function applyYandexPreset(): void {
  // в dev-сборке пресет уже содержит ключ и каталог из .env
  settings.value = { ...YANDEX_PRESET, apiKey: YANDEX_PRESET.apiKey || settings.value.apiKey }
}
</script>

<template>
  <Card>
    <template #title>
      {{ t('settings.language.title') }}
    </template>
    <template #subtitle>
      {{ t('settings.language.subtitle') }}
    </template>
    <template #content>
      <!-- поля не растягиваем на всю карточку: строка длиннее ~80 символов уже плохо читается -->
      <div class="flex max-w-2xl flex-col gap-4 pt-2">
        <div class="flex flex-wrap gap-4">
          <div class="flex flex-col gap-2">
            <label
              for="ui-lang"
              class="text-muted"
            >
              {{ t('settings.language.ui') }}
            </label>
            <Select
              id="ui-lang"
              v-model="readerSettings.uiLang"
              :options="UI_LANGUAGES"
              option-label="native"
              option-value="code"
              class="w-44"
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
              v-model="readerSettings.sourceLang"
              :options="LANGUAGES"
              option-label="native"
              option-value="code"
              class="w-44"
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
              v-model="readerSettings.targetLang"
              :options="LANGUAGES"
              option-label="native"
              option-value="code"
              class="w-44"
            />
          </div>

          <div class="flex flex-col gap-2">
            <label
              for="reader-level"
              class="text-muted"
            >
              {{ t('settings.language.level') }}
            </label>
            <Select
              id="reader-level"
              v-model="readerSettings.level"
              :options="[...CEFR_LEVELS]"
              class="w-32"
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
      {{ t('settings.model.title') }}
    </template>
    <template #subtitle>
      {{ t('settings.model.subtitle') }}
    </template>
    <template #content>
      <div class="flex max-w-2xl flex-col gap-4 pt-2">
        <div class="flex flex-col gap-2">
          <label
            for="llm-provider"
            class="text-muted"
          >
            {{ t('settings.model.provider') }}
          </label>
          <Select
            id="llm-provider"
            :model-value="settings.provider"
            :options="providerOptions"
            option-label="title"
            option-value="id"
            class="w-64"
            @update:model-value="applyProvider"
          />
          <small
            v-if="providerKeyUrl"
            class="text-muted"
          >
            {{ t('settings.model.keyHintBefore') }}
            <a
              :href="providerKeyUrl"
              target="_blank"
              rel="noreferrer noopener"
              class="underline underline-offset-2"
            >{{ t('settings.model.keyHintLink') }}</a>.
          </small>
        </div>

        <div class="flex flex-col gap-2">
          <label
            for="llm-base-url"
            class="text-muted"
          >
            {{ t('settings.model.baseUrl') }}
          </label>
          <InputText
            id="llm-base-url"
            v-model="settings.baseUrl"
            placeholder="http://localhost:1234"
          />
        </div>

        <div class="flex flex-col gap-2">
          <label
            for="llm-model"
            class="text-muted"
          >
            {{ t('settings.model.model') }}
          </label>
          <InputText
            id="llm-model"
            v-model="settings.model"
            placeholder="gpt-oss"
          />
          <small
            v-if="settings.provider === 'openai'"
            class="text-muted"
          >
            {{ t('settings.model.modelHint') }}
          </small>
        </div>

        <div class="flex flex-col gap-2">
          <label
            for="llm-key"
            class="text-muted"
          >
            {{ t('settings.model.apiKey') }}
          </label>
          <InputText
            id="llm-key"
            v-model="settings.apiKey"
            type="password"
            autocomplete="off"
            :placeholder="t('settings.model.apiKeyPlaceholder')"
          />
        </div>

        <div class="flex flex-col gap-2">
          <label
            for="prompt-extra"
            class="text-muted"
          >
            {{ t('settings.model.promptExtra') }}
          </label>
          <Textarea
            id="prompt-extra"
            v-model="readerSettings.promptExtra"
            rows="3"
            auto-resize
            :maxlength="PROMPT_EXTRA_LIMIT"
            :placeholder="t('settings.model.promptExtraPlaceholder')"
          />
          <small class="text-muted">
            {{ t('settings.model.promptExtraHint', { left: PROMPT_EXTRA_LIMIT - readerSettings.promptExtra.length }) }}
          </small>
        </div>

        <div class="flex items-center gap-2">
          <ToggleSwitch
            v-model="readerSettings.autoAnalyze"
            input-id="auto-analyze"
          />
          <label for="auto-analyze">
            {{ t('settings.model.autoAnalyze') }}
          </label>
        </div>
        <small class="-mt-2 text-muted">
          {{ t('settings.model.autoAnalyzeHint') }}
        </small>

        <div class="flex flex-col gap-2">
          <small class="text-muted">
            {{ t('settings.model.presets') }}
          </small>
          <div class="flex flex-wrap gap-2">
            <Button
              :label="t('settings.model.localPreset')"
              severity="secondary"
              size="small"
              @click="applyLocalPreset"
            />
            <Button
              :label="t(HAS_DEV_YANDEX_CREDENTIALS ? 'settings.model.yandexPresetDev' : 'settings.model.yandexPreset')"
              severity="secondary"
              size="small"
              @click="applyYandexPreset"
            />
            <Button
              v-for="preset in OPENAI_COMPATIBLE_PRESETS"
              :key="preset.title"
              :label="preset.title"
              severity="secondary"
              size="small"
              @click="applyCompatiblePreset(preset)"
            />
          </div>
        </div>
      </div>
    </template>
  </Card>

  <Card>
    <template #title>
      {{ t('settings.dictionaries.title') }}
    </template>
    <template #subtitle>
      {{ t('settings.dictionaries.subtitle') }}
    </template>
    <template #content>
      <div class="flex max-w-2xl flex-col gap-4 pt-2">
        <div class="flex flex-col gap-2">
          <label
            for="dict-yandex-key"
            class="text-muted"
          >
            {{ t('settings.dictionaries.yandexKey') }}
          </label>
          <InputText
            id="dict-yandex-key"
            v-model="dictSettings.yandexKey"
            type="password"
            autocomplete="off"
            placeholder="dict.1.1..."
          />
          <small class="text-muted">
            {{ t('settings.dictionaries.yandexHintBefore') }}
            <a
              :href="YANDEX_DICT_KEY_URL"
              target="_blank"
              rel="noreferrer noopener"
              class="underline underline-offset-2"
            >{{ t('settings.dictionaries.yandexHintLink') }}</a>.
            {{ t('settings.dictionaries.yandexHintAfter') }}
          </small>
        </div>

        <div class="flex items-center gap-2">
          <ToggleSwitch
            v-model="dictSettings.preferDictionary"
            input-id="prefer-dictionary"
          />
          <label for="prefer-dictionary">
            {{ t('settings.dictionaries.preferDictionary') }}
          </label>
        </div>
        <small class="-mt-2 text-muted">
          {{ t('settings.dictionaries.preferDictionaryHint') }}
        </small>

        <div class="flex flex-col gap-2 border-t border-line pt-4">
          <label
            for="translator"
            class="text-muted"
          >
            {{ t('settings.dictionaries.translator') }}
          </label>
          <Select
            id="translator"
            v-model="dictSettings.translator"
            :options="translatorOptions"
            option-label="title"
            option-value="id"
            class="w-64"
          />
          <small class="text-muted">
            {{ t('settings.dictionaries.translatorHint') }}
          </small>
        </div>

        <div
          v-if="dictSettings.translator === 'deepl'"
          class="flex flex-col gap-2"
        >
          <label
            for="deepl-key"
            class="text-muted"
          >
            {{ t('settings.dictionaries.deeplKey') }}
          </label>
          <InputText
            id="deepl-key"
            v-model="dictSettings.deeplKey"
            type="password"
            autocomplete="off"
            placeholder="xxxxxxxx-xxxx-…:fx"
          />
          <small class="text-muted">
            {{ t('settings.dictionaries.deeplHint') }}
            <a
              href="https://www.deepl.com/pro-api"
              target="_blank"
              rel="noreferrer noopener"
              class="underline underline-offset-2"
            >deepl.com/pro-api</a>.
          </small>
        </div>

        <template v-if="dictSettings.translator === 'libre'">
          <div class="flex flex-col gap-2">
            <label
              for="libre-url"
              class="text-muted"
            >
              {{ t('settings.dictionaries.libreUrl') }}
            </label>
            <InputText
              id="libre-url"
              v-model="dictSettings.libreUrl"
              placeholder="https://libretranslate.com"
            />
          </div>

          <div class="flex flex-col gap-2">
            <label
              for="libre-key"
              class="text-muted"
            >
              {{ t('settings.dictionaries.libreKey') }}
            </label>
            <InputText
              id="libre-key"
              v-model="dictSettings.libreKey"
              type="password"
              autocomplete="off"
              :placeholder="t('settings.dictionaries.libreKeyPlaceholder')"
            />
          </div>
        </template>
      </div>
    </template>
  </Card>

  <Card>
    <template #title>
      {{ t('settings.sites.title') }}
    </template>
    <template #subtitle>
      {{ t('settings.sites.subtitle') }}
    </template>
    <template #content>
      <div class="max-w-2xl pt-2">
        <AccessSites />
      </div>
    </template>
  </Card>
</template>
