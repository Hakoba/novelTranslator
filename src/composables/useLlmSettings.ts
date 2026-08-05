import type { Ref } from "vue"
import { useBrowserSyncStorage } from "./useBrowserStorage"

export interface LlmSettings {
  /** Базовый URL OpenAI-совместимого сервера (LM Studio, Ollama, …) */
  baseUrl: string
  model: string
}

export const DEFAULT_LLM_SETTINGS: LlmSettings = {
  baseUrl: "http://localhost:1234",
  model: "gpt-oss",
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

  return data.value
}
