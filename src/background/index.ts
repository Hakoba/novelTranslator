import browser from "webextension-polyfill"
import type { BgFetchResponse } from "@/utils/bgFetch"

// Sample code if using extensionpay.com
// import { extPay } from 'src/utils/payment/extPay'
// extPay.startBackground()

chrome.runtime.onInstalled.addListener(async (opt) => {
  // Check if reason is install or update. Eg: opt.reason === 'install' // If extension is installed.
  // opt.reason === 'update' // If extension is updated.
  if (opt.reason === "install") {
    chrome.tabs.create({
      active: true,
      // Open the setup page and append `?type=install` to the URL so frontend
      // can know if we need to show the install page or update page.
      url: chrome.runtime.getURL("src/ui/setup/index.html"),
    })

    return
  }

  if (opt.reason === "update") {
    chrome.tabs.create({
      active: true,
      url: chrome.runtime.getURL("src/ui/setup/index.html?type=update"),
    })

    return
  }
})

self.onerror = function (message, source, lineno, colno, error) {
  console.info("Error: " + message)
  console.info("Source: " + source)
  console.info("Line: " + lineno)
  console.info("Column: " + colno)
  console.info("Error object: " + error)
}

console.info("hello world from background")

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null
}

async function proxyFetch(message: Record<string, unknown>): Promise<BgFetchResponse> {
  const url = typeof message.url === 'string' ? message.url : ''
  const initRaw = isObject(message.init) ? message.init : undefined
  const method = initRaw && typeof initRaw.method === 'string' ? initRaw.method : 'GET'
  const headers = initRaw && isObject(initRaw.headers)
    ? Object.entries(initRaw.headers).reduce<Record<string, string>>((acc, [k, v]) => {
        if (typeof v === 'string') acc[k] = v
        return acc
      }, {})
    : undefined
  const body = initRaw && typeof initRaw.body === 'string' ? initRaw.body : undefined

  console.info('[nt] fetch:', url, 'ключ передан:', Boolean(headers?.Authorization))

  try {
    const res = await fetch(url, { method, headers, body })
    // Try JSON first, fallback to text
    let data: unknown
    try {
      data = await res.json()
    } catch {
      data = await res.text()
    }
    console.info('[nt] ответ модели:', res.status)

    return { ok: res.ok, status: res.status, data }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.info('[nt] fetch упал:', msg)

    return { ok: false, status: 0, error: msg }
  }
}

// Proxy fetch requests: content script не может ходить на http-эндпоинт LLM со https-страницы
// Возвращаем Promise только для своих сообщений, чужие отдаём другим слушателям (undefined)
browser.runtime.onMessage.addListener((message: unknown) => {
  if (!isObject(message) || message.type !== 'llm/fetch') return
  return proxyFetch(message)
})

export {}
