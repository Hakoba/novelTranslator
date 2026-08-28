import { onMounted, ref, type Ref } from 'vue'
import type { Runtime } from 'webextension-polyfill'
import { isValidUrl } from '@/composables/matchesSite'
import {
  PANEL_PORT,
  panelStateFromMessage,
  requestPanelState,
  sendPanelCommand,
  type PanelCommand,
  type PanelState,
} from '@/utils/panelBus'

export interface PanelChannel {
  /** Снимок разбора активной вкладки; `null` — оверлея на ней нет */
  state: Ref<PanelState | null>
  tabId: Ref<number | undefined>
  /** Адрес открытой вкладки: из него берётся домен для кнопки «разрешить» */
  currentUrl: Ref<string>
  command: (panelCommand: PanelCommand) => void
  reloadTab: () => void
}

/**
 * Связь боковой панели с оверлеем активной вкладки. Состояние разбора живёт
 * только у оверлея в content script: панель спрашивает снимок при открытии
 * и смене вкладки, дальше оверлей присылает обновления сам.
 */
export function usePanelChannel(): PanelChannel {
  const state = ref<PanelState | null>(null)
  const tabId = ref<number | undefined>(undefined)
  const currentUrl = ref<string>('')

  /** Панель существует в одном окне: активации вкладок чужих окон — не про неё */
  let windowId: number | undefined
  let port: Runtime.Port | undefined
  let portTabId: number | undefined

  /**
   * Пока панель смотрит на вкладку, держим к ней порт: по живому порту оверлей
   * прячет кнопку открытия панели. Закрыли панель — порт рвётся сам.
   */
  function attachToTab(): void {
    if (port && portTabId === tabId.value) return

    port?.disconnect()
    port = undefined
    portTabId = undefined

    if (tabId.value === undefined) return

    const next = browser.tabs.connect(tabId.value, { name: PANEL_PORT })
    // страницу перезагрузили или на вкладке нет content script — соединения больше нет
    next.onDisconnect.addListener(() => {
      if (port !== next) return

      port = undefined
      portTabId = undefined
    })
    port = next
    portTabId = tabId.value
  }

  async function connect(): Promise<void> {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
    tabId.value = tab?.id
    // у страниц chrome:// и about: адрес либо не отдают, либо он не http — там предлагать нечего
    currentUrl.value = tab?.url && isValidUrl(tab.url) ? tab.url : ''

    attachToTab()
    state.value = tabId.value === undefined ? null : await requestPanelState(tabId.value)
  }

  function command(panelCommand: PanelCommand): void {
    if (tabId.value !== undefined) sendPanelCommand(tabId.value, panelCommand)
  }

  function reloadTab(): void {
    if (tabId.value !== undefined) void browser.tabs.reload(tabId.value)
  }

  onMounted(async (): Promise<void> => {
    const current = await browser.windows.getCurrent()
    windowId = current.id
    await connect()

    browser.tabs.onActivated.addListener((info) => {
      if (info.windowId !== windowId) return

      void connect()
    })

    // обычная загрузка страницы: если сайт не разрешён, оверлей ничего не пришлёт,
    // и без опроса панель осталась бы со снимком предыдущей страницы
    browser.tabs.onUpdated.addListener((updatedTabId, change) => {
      if (updatedTabId !== tabId.value || change.status !== 'complete') return

      void connect()
    })

    // Esc во время выбора области: подсказка на странице обещает отмену, но слушает её
    // страница, а фокус после клика по кнопке остался здесь — без этого Esc молчит
    window.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !state.value?.isPicking) return

      command({ command: 'pickArea' })
    })

    // оверлей шлёт снимки сам: и по ходу разбора, и при переходах внутри SPA
    browser.runtime.onMessage.addListener((message: unknown, sender: Runtime.MessageSender) => {
      const next = panelStateFromMessage(message)
      if (next === undefined || sender.tab?.id !== tabId.value) return

      state.value = next
    })
  })

  return { state, tabId, currentUrl, command, reloadTab }
}
