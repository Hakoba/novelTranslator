<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { BookA, ExternalLink, KeyRound, Languages, Link } from 'lucide-vue-next'
import InlineSvg from '@/components/InlineSvg.vue'
import dictionariesArt from '@/assets/illustrations/dictionaries.svg?raw'
import { HAS_BUNDLED_DICT_KEY, YANDEX_DICT_KEY_URL, useDictSettings } from '@/composables/useDictSettings'
import { TRANSLATOR_LIST } from '@/utils/mt/translators'

const { t } = useI18n()
const { settings } = useDictSettings()

// computed
const translatorOptions = computed<{ id: string; title: string }[]>(() => [
  { id: 'none', title: t('settings.dictionaries.translatorNone') },
  ...TRANSLATOR_LIST.map(({ id, title }) => ({ id, title })),
])
</script>

<template>
  <Card>
    <template #title>
      <div class="flex items-center justify-between gap-4">
        <span class="flex items-center gap-2">
          <BookA :size="20" />
          {{ t('settings.dictionaries.title') }}
        </span>
        <!-- эмблема раздела: словарная статья, которую собирают эти настройки -->
        <InlineSvg
          :markup="dictionariesArt"
          class="w-20 text-content"
        />
      </div>
    </template>
    <template #subtitle>
      {{ t('settings.dictionaries.subtitle') }}
    </template>
    <template #content>
      <div class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-2">
          <label
            for="dict-yandex-key"
            class="flex items-center gap-2 text-muted"
          >
            <KeyRound :size="14" />
            {{ t('settings.dictionaries.yandexKey') }}
          </label>
          <Password
            v-model="settings.yandexKey"
            input-id="dict-yandex-key"
            toggle-mask
            :feedback="false"
            fluid
            :input-props="{ autocomplete: 'off' }"
            placeholder="dict.1.1..."
          />
          <small class="text-muted">
            {{ t('settings.dictionaries.yandexHintBefore') }}
            <a
              :href="YANDEX_DICT_KEY_URL"
              target="_blank"
              rel="noreferrer noopener"
              class="inline-flex items-center gap-1 underline underline-offset-2"
            >{{ t('settings.dictionaries.yandexHintLink') }}<ExternalLink :size="12" /></a>.
            {{ t('settings.dictionaries.yandexHintAfter') }}
          </small>

          <Message
            v-if="HAS_BUNDLED_DICT_KEY && !settings.yandexKey"
            severity="info"
            size="small"
            variant="simple"
          >
            {{ t('settings.dictionaries.sharedKey') }}
          </Message>
        </div>

        <div class="flex items-center gap-2 border-t border-line pt-4">
          <ToggleSwitch
            v-model="settings.preferDictionary"
            input-id="prefer-dictionary"
          />
          <label for="prefer-dictionary">
            {{ t('settings.dictionaries.preferDictionary') }}
          </label>
        </div>
        <small class="-mt-2 text-muted">
          {{ t('settings.dictionaries.preferDictionaryHint') }}
        </small>
      </div>
    </template>
  </Card>

  <Card>
    <template #title>
      <span class="flex items-center gap-2">
        <Languages :size="20" />
        {{ t('settings.dictionaries.mtTitle') }}
      </span>
    </template>
    <template #subtitle>
      {{ t('settings.dictionaries.mtSubtitle') }}
    </template>
    <template #content>
      <div class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-2">
          <label
            for="translator"
            class="flex items-center gap-2 text-muted"
          >
            <Languages :size="14" />
            {{ t('settings.dictionaries.translator') }}
          </label>
          <Select
            id="translator"
            v-model="settings.translator"
            :options="translatorOptions"
            option-label="title"
            option-value="id"
            class="w-full sm:w-80"
          />
          <small class="text-muted">
            {{ t('settings.dictionaries.translatorHint') }}
          </small>
        </div>

        <div
          v-if="settings.translator === 'deepl'"
          class="flex flex-col gap-2"
        >
          <label
            for="deepl-key"
            class="flex items-center gap-2 text-muted"
          >
            <KeyRound :size="14" />
            {{ t('settings.dictionaries.deeplKey') }}
          </label>
          <Password
            v-model="settings.deeplKey"
            input-id="deepl-key"
            toggle-mask
            :feedback="false"
            fluid
            :input-props="{ autocomplete: 'off' }"
            placeholder="xxxxxxxx-xxxx-…:fx"
          />
          <small class="text-muted">
            {{ t('settings.dictionaries.deeplHint') }}
            <a
              href="https://www.deepl.com/pro-api"
              target="_blank"
              rel="noreferrer noopener"
              class="inline-flex items-center gap-1 underline underline-offset-2"
            >deepl.com/pro-api<ExternalLink :size="12" /></a>.
          </small>
        </div>

        <template v-if="settings.translator === 'libre'">
          <div class="flex flex-col gap-2">
            <label
              for="libre-url"
              class="flex items-center gap-2 text-muted"
            >
              <Link :size="14" />
              {{ t('settings.dictionaries.libreUrl') }}
            </label>
            <InputText
              id="libre-url"
              v-model="settings.libreUrl"
              placeholder="https://libretranslate.com"
            />
          </div>

          <div class="flex flex-col gap-2">
            <label
              for="libre-key"
              class="flex items-center gap-2 text-muted"
            >
              <KeyRound :size="14" />
              {{ t('settings.dictionaries.libreKey') }}
            </label>
            <Password
              v-model="settings.libreKey"
              input-id="libre-key"
              toggle-mask
              :feedback="false"
              fluid
              :input-props="{ autocomplete: 'off' }"
              :placeholder="t('settings.dictionaries.libreKeyPlaceholder')"
            />
          </div>
        </template>
      </div>
    </template>
  </Card>
</template>
