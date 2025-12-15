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

// Proxy fetch requests to avoid CORS issues from content scripts
// We keep payload types minimal and validated without using "as"
chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  // Narrow message type
  const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
  if (!isObject(message)) return
  const type = typeof message.type === 'string' ? message.type : ''
  if (type !== 'llm/fetch') return

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

  ;(async () => {
    try {
      const res = await fetch(url, { method, headers, body })
      const status = res.status
      const ok = res.ok
      // Try JSON first, fallback to text
      let data: unknown
      try {
        data = await res.json()
      } catch {
        data = await res.text()
      }
      sendResponse({ ok, status, data })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      sendResponse({ ok: false, status: 0, error: msg })
    }
  })()

  // Indicate async response
  return true
})

export {}
