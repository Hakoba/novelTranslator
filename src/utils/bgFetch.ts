export type BgFetchResponse = { ok: boolean; status: number; data?: unknown; error?: string }

export function sendBgFetch(
  url: string,
  init: { method?: string; headers?: Record<string, string>; body?: string },
  signal?: AbortSignal,
): Promise<BgFetchResponse> {
  return new Promise((resolve, reject) => {
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
      reject(new Error('Chrome runtime is not available'))
      return
    }

    let aborted = false
    const onAbort = (): void => {
      aborted = true
      reject(new DOMException('Aborted', 'AbortError'))
    }
    if (signal) {
      if (signal.aborted) return onAbort()
      signal.addEventListener('abort', onAbort, { once: true })
    }

    chrome.runtime.sendMessage({ type: 'llm/fetch', url, init }, (res: unknown) => {
      if (signal) signal.removeEventListener('abort', onAbort)
      if (aborted) return

      const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
      if (!isObject(res)) {
        reject(new Error('Bad background response'))
        return
      }

      const ok = typeof res.ok === 'boolean' ? res.ok : false
      const status = typeof res.status === 'number' ? res.status : 0
      const data = res.data
      const error = typeof res.error === 'string' ? res.error : undefined
      resolve({ ok, status, data, error })
    })
  })
}
