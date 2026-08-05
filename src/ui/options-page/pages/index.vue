<script setup lang="ts">
import AccessSites from '@/components/accessSites.vue'
import {
  LOCAL_PRESET,
  YANDEX_BASE_URL,
  useLlmSettings,
  yandexModelUri,
} from '@/composables/useLlmSettings'

const { settings } = useLlmSettings()

// методы
function applyLocalPreset(): void {
  settings.value = { ...LOCAL_PRESET }
}

function applyYandexPreset(): void {
  settings.value = {
    baseUrl: YANDEX_BASE_URL,
    model: yandexModelUri('<идентификатор каталога>'),
    apiKey: settings.value.apiKey,
  }
}
</script>

<template>
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
            У Яндекса имя модели выглядит как gpt://&lt;каталог&gt;/yandexgpt/latest
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
            label="Yandex AI Studio"
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
