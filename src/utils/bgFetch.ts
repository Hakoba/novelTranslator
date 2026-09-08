import browser from 'webextension-polyfill'
import { t } from '@/utils/i18n'

export type BgFetchResponse = { ok: boolean; status: number; data?: unknown; error?: string }

export type BgFetchInit = { method?: string; headers?: Record<string, string>; body?: string }

/**
 * Потолок ожидания, когда вызывающий не принёс свой signal: у словарей
 * и переводчиков таймаута нет, и зависший сервер держал «Разбираю страницу» вечно.
 */
export const BG_FETCH_TIMEOUT_MS = 20000

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null
}

function abortSignalPromise(signal: AbortSignal): Promise<never> {
  return new Promise((_resolve, reject) => {
    // текст всплывает рядом со списком слов как есть, поэтому не «Aborted»;
    // путь модели его не показывает — там своя надпись по имени ошибки
    const abort = (): void =>
      reject(new DOMException(t('errors.requestTimeout', { seconds: BG_FETCH_TIMEOUT_MS / 1000 }), 'AbortError'))
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
  // без query: у словарей ключ лежит прямо в адресе, а логи видны на любой странице
  console.info('[nt] запрос в background:', url.split('?')[0])
  const request = browser.runtime.sendMessage({ type: 'llm/fetch', url, init })
  // abort только перестаёт ждать ответ — запрос в background уже ушёл и доживёт сам
  const guard = signal ?? AbortSignal.timeout(BG_FETCH_TIMEOUT_MS)
  const res: unknown = await Promise.race([request, abortSignalPromise(guard)])
  console.info('[nt] ответ background:', res)

  if (!isObject(res)) {
    throw new Error('Background не ответил на запрос к модели — перезагрузите расширение')
  }

  return {
    ok: typeof res.ok === 'boolean' ? res.ok : false,
    status: typeof res.status === 'number' ? res.status : 0,
    data: res.data,
    error: typeof res.error === 'string' ? res.error : undefined,
  }
}
