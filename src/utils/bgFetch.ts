import browser from 'webextension-polyfill'

export type BgFetchResponse = { ok: boolean; status: number; data?: unknown; error?: string }

export type BgFetchInit = { method?: string; headers?: Record<string, string>; body?: string }

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null
}

function abortSignalPromise(signal: AbortSignal): Promise<never> {
  return new Promise((_resolve, reject) => {
    const abort = (): void => reject(new DOMException('Aborted', 'AbortError'))
    if (signal.aborted) return abort()
    signal.addEventListener('abort', abort, { once: true })
  })
}

/**
 * Проксирует fetch через background: content script не может ходить на http-эндпоинт
 * LLM со https-страницы (mixed content), а service worker может.
 */
export async function sendBgFetch(
  url: string,
  init: BgFetchInit,
  signal?: AbortSignal,
): Promise<BgFetchResponse> {
  const request = browser.runtime.sendMessage({ type: 'llm/fetch', url, init })
  // abort только перестаёт ждать ответ — запрос в background уже ушёл и доживёт сам
  const res: unknown = signal ? await Promise.race([request, abortSignalPromise(signal)]) : await request

  if (!isObject(res)) {
    throw new Error('Bad background response')
  }

  return {
    ok: typeof res.ok === 'boolean' ? res.ok : false,
    status: typeof res.status === 'number' ? res.status : 0,
    data: res.data,
    error: typeof res.error === 'string' ? res.error : undefined,
  }
}
