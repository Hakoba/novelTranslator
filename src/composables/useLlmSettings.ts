import type { Ref } from "vue"
import { useBrowserSyncStorage } from "./useBrowserStorage"

export interface LlmSettings {
  /** Базовый URL OpenAI-совместимого API: LM Studio, Ollama, llama.cpp, Yandex AI Studio */
  baseUrl: string
  model: string
  /** Пусто для локальных серверов; для облачных уходит в Authorization: Bearer */
  apiKey: string
}

export const LOCAL_PRESET: LlmSettings = {
  baseUrl: "http://localhost:1234",
  model: "gpt-oss",
  apiKey: "",
}

/** Yandex AI Studio совместим с OpenAI API, отличается только адресом и форматом имени модели */
export const YANDEX_BASE_URL = "https://llm.api.cloud.yandex.net"

export function yandexModelUri(folderId: string, model = "yandexgpt/latest"): string {
  return `gpt://${folderId}/${model}`
}

// в dev-сборку ключи подставляются из .env, в прод-сборке пустые
const devApiKey = __YANDEX_API_KEY__
const devFolderId = __YANDEX_FOLDER_ID__

export const DEFAULT_LLM_SETTINGS: LlmSettings = devApiKey && devFolderId
  ? { baseUrl: YANDEX_BASE_URL, model: yandexModelUri(devFolderId), apiKey: devApiKey }
  : LOCAL_PRESET

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

  return data.value
}
