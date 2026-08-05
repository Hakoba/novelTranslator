<script setup lang="ts">
import AccessSites from '@/components/accessSites.vue'
import { DEFAULT_LLM_SETTINGS, useLlmSettings } from '@/composables/useLlmSettings'

const { settings } = useLlmSettings()

// методы
function resetLlm(): void {
  settings.value = { ...DEFAULT_LLM_SETTINGS }
}
</script>

<template>
  <Card>
    <template #title>
      Модель
    </template>
    <template #subtitle>
      Любой OpenAI-совместимый сервер: LM Studio, Ollama, llama.cpp
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
        </div>

        <div>
          <Button
            label="Сбросить"
            severity="secondary"
            size="small"
            @click="resetLlm"
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
