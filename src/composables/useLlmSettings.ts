import type { Ref } from "vue"
import { useBrowserSyncStorage } from "./useBrowserStorage"
import { getProvider, PROVIDERS, type ProviderId } from "@/utils/llm/providers"

export interface LlmSettings {
  /** Семейство API: OpenAI-совместимое, Anthropic Messages или Google Gemini */
  provider: ProviderId
  /** Базовый URL: у локальных серверов свой, у облаков подставляется из провайдера */
  baseUrl: string
  model: string
  /** Пусто для локальных серверов; куда именно уходит ключ, решает провайдер */
  apiKey: string
}

export const LOCAL_PRESET: LlmSettings = {
  provider: "openai",
  baseUrl: "http://localhost:1234",
  model: "gpt-oss",
  apiKey: "",
}

/** Yandex AI Studio совместим с OpenAI API, отличается только адресом и форматом имени модели */
export const YANDEX_BASE_URL = "https://llm.api.cloud.yandex.net"

// lite дешевле полной модели в разы, а на «выдай список сложных слов» её хватает
export function yandexModelUri(folderId: string, model = "yandexgpt-lite/latest"): string {
  return `gpt://${folderId}/${model}`
}

// в dev-сборку ключи подставляются из .env, в прод-сборке пустые
const devApiKey = __YANDEX_API_KEY__
const devFolderId = __YANDEX_FOLDER_ID__

/** Пресет Яндекса. В dev подставляет ключ и каталог из .env, в прод-сборке оставляет поля пустыми */
export const YANDEX_PRESET: LlmSettings = {
  provider: "openai",
  baseUrl: YANDEX_BASE_URL,
  model: yandexModelUri(devFolderId || "<идентификатор каталога>"),
  apiKey: devApiKey,
}

/**
 * Совместимые с OpenAI облака: отличаются только адресом и именем модели,
 * поэтому это кнопки-пресеты, а не отдельные провайдеры.
 */
export const OPENAI_COMPATIBLE_PRESETS: { title: string; baseUrl: string; model: string; keyUrl: string }[] = [
  {
    title: "OpenAI",
    baseUrl: "https://api.openai.com",
    model: "gpt-4o-mini",
    keyUrl: "https://platform.openai.com/api-keys",
  },
  {
    title: "OpenRouter",
    baseUrl: "https://openrouter.ai/api",
    model: "openai/gpt-4o-mini",
    keyUrl: "https://openrouter.ai/keys",
  },
  {
    title: "Groq",
    baseUrl: "https://api.groq.com/openai",
    model: "llama-3.3-70b-versatile",
    keyUrl: "https://console.groq.com/keys",
  },
  {
    title: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-chat",
    keyUrl: "https://platform.deepseek.com/api_keys",
  },
  {
    title: "Mistral",
    baseUrl: "https://api.mistral.ai",
    model: "mistral-small-latest",
    keyUrl: "https://console.mistral.ai/api-keys",
  },
]

export const HAS_DEV_YANDEX_CREDENTIALS = Boolean(devApiKey && devFolderId)

export const DEFAULT_LLM_SETTINGS: LlmSettings = HAS_DEV_YANDEX_CREDENTIALS
  ? YANDEX_PRESET
  : LOCAL_PRESET

/** Смена провайдера тянет за собой адрес и модель: чужие в новом API всё равно не работают */
export function presetForProvider(id: ProviderId): LlmSettings {
  const provider = PROVIDERS[id]

  return {
    provider: id,
    baseUrl: provider.defaultBaseUrl,
    model: provider.defaultModel,
    apiKey: "",
  }
}

const { data, promise } = useBrowserSyncStorage<LlmSettings>(
  "llm-settings",
  DEFAULT_LLM_SETTINGS,
)

export function useLlmSettings(): {
  settings: Ref<LlmSettings>
  promise: Promise<unknown>
} {
  return { settings: data, promise }
}

/** Для не-Vue кода (llmClient): дожидается загрузки из storage */
export async function getLlmSettings(): Promise<LlmSettings> {
  await promise
  const current = data.value

  // настройки, сохранённые до появления выбора провайдера, приходят без него
  const settings: LlmSettings = { ...current, provider: getProvider(current.provider).id }

  // в dev-сборке не заставляем вбивать ключ руками, если он уже лежит в .env
  return settings.apiKey || !devApiKey ? settings : { ...settings, apiKey: devApiKey }
}
