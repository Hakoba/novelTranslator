<script setup lang="ts">
import AccessSites from '@/components/accessSites.vue'
import {
  HAS_DEV_YANDEX_CREDENTIALS,
  LOCAL_PRESET,
  YANDEX_PRESET,
  useLlmSettings,
} from '@/composables/useLlmSettings'
import { useReaderSettings } from '@/composables/useReaderSettings'
import { CEFR_LEVELS } from '@/types/words'

const { settings } = useLlmSettings()
const { settings: readerSettings } = useReaderSettings()

// методы
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
      Уровень языка
    </template>
    <template #subtitle>
      Слова ниже вашего уровня в разбор не попадают
    </template>
    <template #content>
      <div class="flex flex-col gap-2 pt-2">
        <label
          for="reader-level"
          class="text-muted"
        >
          Мой уровень английского
        </label>
        <Select
          id="reader-level"
          v-model="readerSettings.level"
          :options="[...CEFR_LEVELS]"
          class="w-40"
        />
        <small class="text-muted">
          При B2 модель отдаёт только C1 и выше. Уровень уходит в запрос, а не фильтрует
          ответ на месте, — поэтому смена уровня видна после следующего разбора главы.
        </small>
      </div>
    </template>
  </Card>

  <Card>
    <template #title>
      Модель
    </template>
    <template #subtitle>
      Любой сервер с OpenAI-совместимым API: LM Studio, Ollama, llama.cpp, Yandex AI Studio
    </template>
    <template #content>
      <div class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-2">
          <label
            for="llm-base-url"
            class="text-muted"
          >
            Адрес сервера
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
            Модель
          </label>
          <InputText
            id="llm-model"
            v-model="settings.model"
            placeholder="gpt-oss"
          />
          <small class="text-muted">
            У Яндекса имя модели выглядит как gpt://&lt;каталог&gt;/yandexgpt-lite/latest.
            Полная модель — yandexgpt/latest, она заметно дороже.
          </small>
        </div>

        <div class="flex flex-col gap-2">
          <label
            for="llm-key"
            class="text-muted"
          >
            Ключ API
          </label>
          <InputText
            id="llm-key"
            v-model="settings.apiKey"
            type="password"
            autocomplete="off"
            placeholder="для локальной модели не нужен"
          />
        </div>

        <div class="flex flex-wrap gap-2">
          <Button
            label="Локальная модель"
            severity="secondary"
            size="small"
            @click="applyLocalPreset"
          />
          <Button
            :label="HAS_DEV_YANDEX_CREDENTIALS ? 'Yandex AI Studio (ключ из .env)' : 'Yandex AI Studio'"
            severity="secondary"
            size="small"
            @click="applyYandexPreset"
          />
        </div>
      </div>
    </template>
  </Card>

  <Card>
    <template #title>
      Разрешённые сайты
    </template>
    <template #subtitle>
      Расширение работает только на сайтах из списка
    </template>
    <template #content>
      <div class="pt-2">
        <AccessSites />
      </div>
    </template>
  </Card>
</template>
