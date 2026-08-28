<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Bot, Cloud, Cpu, ExternalLink, KeyRound, Laptop, Link, Plug, Zap } from 'lucide-vue-next'
import AppLoader from '@/components/AppLoader.vue'
import InlineSvg from '@/components/InlineSvg.vue'
import modelArt from '@/assets/illustrations/model.svg?raw'
import modelOfflineArt from '@/assets/illustrations/model-offline.svg?raw'
import {
  HAS_DEV_YANDEX_CREDENTIALS,
  LOCAL_PRESET,
  OPENAI_COMPATIBLE_PRESETS,
  YANDEX_PRESET,
  presetForProvider,
  useLlmSettings,
} from '@/composables/useLlmSettings'
import { PROVIDER_LIST, getProvider, type ProviderId } from '@/utils/llm/providers'
import { checkModel } from '@/utils/llmClient'

const { t } = useI18n()
const { settings } = useLlmSettings()

// state
const checkState = ref<'idle' | 'busy' | 'ok' | 'fail'>('idle')
const checkMessage = ref<string>('')

// computed
/** Проверка перевешивает настройки: она знает наверняка, а адрес с моделью — только обещают */
const isLinked = computed<boolean>(() =>
  checkState.value === 'fail'
    ? false
    : checkState.value === 'ok' || Boolean(settings.value.baseUrl && settings.value.model),
)
const providerKeyUrl = computed<string | undefined>(() => getProvider(settings.value.provider).keyUrl)
// названия видов API живут в локалях: «OpenAI-совместимый» на английском звучит иначе
const providerOptions = computed<{ id: string; title: string }[]>(() =>
  PROVIDER_LIST.map(({ id }) => ({ id, title: t(`settings.model.providers.${id}`) })),
)

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

async function runCheck(): Promise<void> {
  checkState.value = 'busy'
  const started = performance.now()

  try {
    await checkModel()
    const seconds = ((performance.now() - started) / 1000).toFixed(1)
    checkMessage.value = t('settings.model.checkOk', { seconds })
    checkState.value = 'ok'
  } catch (error) {
    // текст ошибки собирает describeError: он уже называет причину и куда лезть
    checkMessage.value = error instanceof Error ? error.message : t('errors.llmUnknown')
    checkState.value = 'fail'
  }
}
</script>

<template>
  <Card>
    <template #title>
      <span class="flex items-center gap-2">
        <Bot :size="20" />
        {{ t('settings.model.title') }}
      </span>
    </template>
    <template #subtitle>
      {{ t('settings.model.subtitle') }}
    </template>
    <template #content>
      <div class="flex flex-col gap-4 pt-2">
        <!-- пресеты выше полей: сначала берут готовое, потом правят руками -->
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
            >
              <template #icon>
                <Laptop :size="14" />
              </template>
            </Button>
            <Button
              :label="t(HAS_DEV_YANDEX_CREDENTIALS ? 'settings.model.yandexPresetDev' : 'settings.model.yandexPreset')"
              severity="secondary"
              size="small"
              @click="applyYandexPreset"
            >
              <template #icon>
                <Cloud :size="14" />
              </template>
            </Button>
            <Button
              v-for="preset in OPENAI_COMPATIBLE_PRESETS"
              :key="preset.title"
              :label="preset.title"
              severity="secondary"
              size="small"
              @click="applyCompatiblePreset(preset)"
            >
              <template #icon>
                <Cloud :size="14" />
              </template>
            </Button>
          </div>
        </div>

        <div class="flex flex-col gap-2 border-t border-line pt-4">
          <label
            for="llm-provider"
            class="flex items-center gap-2 text-muted"
          >
            <Plug :size="14" />
            {{ t('settings.model.provider') }}
          </label>
          <Select
            id="llm-provider"
            :model-value="settings.provider"
            :options="providerOptions"
            option-label="title"
            option-value="id"
            class="w-full sm:w-64"
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
              class="inline-flex items-center gap-1 underline underline-offset-2"
            >{{ t('settings.model.keyHintLink') }}<ExternalLink :size="12" /></a>.
          </small>
        </div>

        <div class="flex flex-col gap-2">
          <label
            for="llm-base-url"
            class="flex items-center gap-2 text-muted"
          >
            <Link :size="14" />
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
            class="flex items-center gap-2 text-muted"
          >
            <Cpu :size="14" />
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
            class="flex items-center gap-2 text-muted"
          >
            <KeyRound :size="14" />
            {{ t('settings.model.apiKey') }}
          </label>
          <!-- toggle-mask: ключ вставляют из консоли провайдера, вслепую опечатку не поймать -->
          <Password
            v-model="settings.apiKey"
            input-id="llm-key"
            toggle-mask
            :feedback="false"
            fluid
            :input-props="{ autocomplete: 'off' }"
            :placeholder="t('settings.model.apiKeyPlaceholder')"
          />
        </div>

        <!-- картинка держит статус связи: пока всё настроено — ядро горит, при
             провале проверки или пустом адресе линия рвётся -->
        <div class="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line pt-4">
          <InlineSvg
            :markup="isLinked ? modelArt : modelOfflineArt"
            class="w-32 text-content"
          />

          <div class="flex min-w-56 flex-1 flex-col gap-2">
            <div>
              <Button
                :label="checkState === 'busy' ? t('settings.model.checkBusy') : t('settings.model.check')"
                severity="secondary"
                outlined
                :disabled="checkState === 'busy'"
                @click="runCheck"
              >
                <template #icon>
                  <!-- спиннер PrimeVue — иконочный шрифт, которого в проекте нет: крутим свою иконку -->
                  <AppLoader
                    v-if="checkState === 'busy'"
                    :size="16"
                  />
                  <Zap
                    v-else
                    :size="16"
                  />
                </template>
              </Button>
            </div>
            <Message
              v-if="checkState === 'ok' || checkState === 'fail'"
              :severity="checkState === 'ok' ? 'success' : 'error'"
              size="small"
              variant="simple"
            >
              {{ checkMessage }}
            </Message>
            <small class="text-muted">
              {{ t('settings.model.checkHint') }}
            </small>
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>
