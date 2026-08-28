<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { BookA, ExternalLink, Globe, KeyRound, Languages, Link, Mail } from 'lucide-vue-next'
import InlineSvg from '@/components/InlineSvg.vue'
import dictionariesArt from '@/assets/illustrations/dictionaries.svg?raw'
import { HAS_BUNDLED_DICT_KEY, YANDEX_DICT_KEY_URL, useDictSettings } from '@/composables/useDictSettings'
import type { Translator } from '@/utils/mt/translators'
import { TRANSLATOR_LIST, YANDEX_SOURCE, getTranslator } from '@/utils/mt/translators'

const { t } = useI18n()
const { settings } = useDictSettings()

// computed
/**
 * Один список на все источники перевода. Яндекс.Словарь идёт первым — он знает
 * значения и транскрипцию, но только для одиночных слов; «не переводить» последним,
 * это отказ, а не источник.
 */
const translatorOptions = computed<{ id: string; title: string }[]>(() => [
  YANDEX_SOURCE,
  ...TRANSLATOR_LIST.map(({ id, title }) => ({ id, title })),
  { id: 'none', title: t('settings.dictionaries.translatorNone') },
])

const translator = computed<Translator | undefined>(() => getTranslator(settings.value.translator))
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

        <Message
          v-if="translator?.unofficial"
          severity="warn"
          size="small"
          variant="simple"
        >
          {{ t('settings.dictionaries.unofficialHint', { title: translator.title }) }}
        </Message>

        <div
          v-if="settings.translator === 'yandex'"
          class="flex flex-col gap-2"
        >
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

        <div
          v-if="settings.translator === 'mymemory'"
          class="flex flex-col gap-2"
        >
          <label
            for="mymemory-email"
            class="flex items-center gap-2 text-muted"
          >
            <Mail :size="14" />
            {{ t('settings.dictionaries.myMemoryEmail') }}
          </label>
          <InputText
            id="mymemory-email"
            v-model="settings.myMemoryEmail"
            type="email"
            autocomplete="off"
            placeholder="reader@example.com"
          />
          <small class="text-muted">
            {{ t('settings.dictionaries.myMemoryHint') }}
          </small>
        </div>

        <div
          v-if="settings.translator === 'lingva'"
          class="flex flex-col gap-2"
        >
          <label
            for="lingva-url"
            class="flex items-center gap-2 text-muted"
          >
            <Link :size="14" />
            {{ t('settings.dictionaries.lingvaUrl') }}
          </label>
          <InputText
            id="lingva-url"
            v-model="settings.lingvaUrl"
            placeholder="https://lingva.ml"
          />
          <small class="text-muted">
            {{ t('settings.dictionaries.lingvaHint') }}
            <a
              href="https://github.com/thedaviddelta/lingva-translate#instances"
              target="_blank"
              rel="noreferrer noopener"
              class="inline-flex items-center gap-1 underline underline-offset-2"
            >github.com/thedaviddelta/lingva-translate<ExternalLink :size="12" /></a>.
          </small>
        </div>

        <template v-if="settings.translator === 'azure'">
          <div class="flex flex-col gap-2">
            <label
              for="azure-key"
              class="flex items-center gap-2 text-muted"
            >
              <KeyRound :size="14" />
              {{ t('settings.dictionaries.azureKey') }}
            </label>
            <Password
              v-model="settings.azureKey"
              input-id="azure-key"
              toggle-mask
              :feedback="false"
              fluid
              :input-props="{ autocomplete: 'off' }"
            />
            <small class="text-muted">
              {{ t('settings.dictionaries.azureHint') }}
            </small>
          </div>

          <div class="flex flex-col gap-2">
            <label
              for="azure-region"
              class="flex items-center gap-2 text-muted"
            >
              <Globe :size="14" />
              {{ t('settings.dictionaries.azureRegion') }}
            </label>
            <InputText
              id="azure-region"
              v-model="settings.azureRegion"
              placeholder="westeurope"
            />
            <small class="text-muted">
              {{ t('settings.dictionaries.azureRegionHint') }}
            </small>
          </div>
        </template>

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

        <!-- толкования не выбираются: они бесплатны, ключа не просят и нужны только карточке -->
        <small class="border-t border-line pt-4 text-muted">
          {{ t('settings.dictionaries.definitions') }}
        </small>
      </div>
    </template>
  </Card>
</template>
