import browser, { type Runtime } from "webextension-polyfill"
import { NO_HOST_ACCESS, type BgFetchResponse } from "@/utils/bgFetch"
import { originPattern } from "@/composables/matchesSite"
import { DICTIONARY_URL } from "@/utils/dictionaryTab"
import { PANEL_OPEN, PANEL_STATE } from "@/utils/panelBus"
import { SCRIPTS_SYNC } from "@/utils/siteScripts"
import { syncSiteScripts } from "./siteScripts"

// Sample code if using extensionpay.com
// import { extPay } from 'src/utils/payment/extPay'
// extPay.startBackground()

chrome.runtime.onInstalled.addListener(async (opt) => {
  // обновление расширения стирает зарегистрированные content script — собираем заново
  void syncSiteScripts()

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

// доступ к сайту меняют и мимо нас — в chrome://extensions; список внедрения идёт за ним
browser.permissions.onAdded.addListener(() => void syncSiteScripts())
browser.permissions.onRemoved.addListener(() => void syncSiteScripts())
browser.runtime.onStartup.addListener(() => void syncSiteScripts())

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null
}

async function hasHostAccess(url: string): Promise<boolean> {
  const pattern = originPattern(url)
  if (!pattern) return true

  return browser.permissions.contains({ origins: [pattern] })
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

  // query не логируем: у словарей ключ лежит прямо в адресе
  console.info('[nt] fetch:', url.split('?')[0], 'ключ передан:', Boolean(headers?.Authorization))

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

    // без доступа к хосту fetch падает тем же «Failed to fetch», что и выключенный сервер;
    // код вместо текста: локали в фоне не нужны, текст подставит `sendBgFetch`
    if (!(await hasHostAccess(url))) return { ok: false, status: 0, error: NO_HOST_ACCESS }

    return { ok: false, status: 0, error: msg }
  }
}

/** Вкладку заводим здесь: в content script `tabs` нет, а из оверлея в словарь ходят */
async function openDictionary(): Promise<void> {
  await browser.tabs.create({ url: browser.runtime.getURL(DICTIONARY_URL) })
}

/** Счётчик найденных слов на иконке: оверлей публикует снимок панели, мы его подслушиваем */
function updateBadge(tabId: number | undefined, state: unknown): void {
  if (tabId === undefined) return

  const count = isObject(state) && Array.isArray(state.words) ? state.words.length : 0
  void browser.action.setBadgeText({ tabId, text: count ? String(count) : '' })
}

void browser.action.setBadgeBackgroundColor({ color: '#3b82f6' })

/**
 * Горячая клавиша открытия панели. Обработчик команды браузер считает жестом
 * пользователя, поэтому `sidePanel.open` отсюда разрешён — в отличие от вызова
 * по таймеру или после await. Команда объявлена только в Chrome-манифесте.
 */
if (__HAS_SIDE_PANEL__) {
  chrome.commands.onCommand.addListener((command, tab) => {
    if (command !== 'open-panel' || tab?.windowId === undefined) return

    chrome.sidePanel.open({ windowId: tab.windowId }).catch((e: unknown) => {
      console.info('[nt] панель не открылась по горячей клавише:', e)
    })
  })
}

// Proxy fetch requests: content script не может ходить на http-эндпоинт LLM со https-страницы
// Возвращаем Promise только для своих сообщений, чужие отдаём другим слушателям (undefined)
browser.runtime.onMessage.addListener((message: unknown, sender: Runtime.MessageSender) => {
  if (!isObject(message)) return
  if (message.type === 'llm/fetch') return proxyFetch(message)
  if (message.type === 'ui/open-dictionary') return openDictionary()
  if (message.type === 'ui/open-options') return browser.runtime.openOptionsPage()
  if (message.type === SCRIPTS_SYNC) return syncSiteScripts()
  if (message.type === PANEL_STATE) updateBadge(sender.tab?.id, message.state)
  // строго синхронно: жест пользователя не переживает await, панель без него не откроется.
  // Приходит только из Chrome-сборки (кнопка за __HAS_SIDE_PANEL__), в Firefox API нет
  if (message.type === PANEL_OPEN && sender.tab?.id !== undefined) {
    chrome.sidePanel.open({ tabId: sender.tab.id }).catch((e: unknown) => {
      console.info('[nt] панель не открылась:', e)
    })
  }
})

export {}
