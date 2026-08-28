import { ref, type Ref } from 'vue'
import browser from 'webextension-polyfill'
import {
  PANEL_COMMAND,
  PANEL_GET,
  PANEL_OPEN,
  PANEL_PORT,
  PANEL_STATE,
  isPanelCommand,
  isRecord,
  type PanelCommand,
  type PanelState,
} from '@/utils/panelBus'

/**
 * Сторона оверлея в протоколе панели. Последний снимок держим на уровне модуля:
 * панель открывается когда угодно и первым делом спрашивает текущее состояние.
 * Снимки слушает и background — он рисует счётчик слов на иконке.
 */
let lastState: PanelState | null = null
let handleCommand: ((command: PanelCommand) => void) | null = null

export function publishPanelState(state: PanelState | null): void {
  lastState = state
  // приёмник есть всегда (background), но при перезагрузке расширения канал рвётся
  void browser.runtime.sendMessage({ type: PANEL_STATE, state }).catch(() => undefined)
}

export function setPanelCommandHandler(handler: (command: PanelCommand) => void): void {
  handleCommand = handler
}

/** Снимаем только свой обработчик: при пересоздании оверлея новый ставится раньше, чем умирает старый */
export function releasePanelCommandHandler(handler: (command: PanelCommand) => void): void {
  if (handleCommand === handler) handleCommand = null
}

browser.runtime.onMessage.addListener((message: unknown) => {
  if (!isRecord(message)) return
  if (message.type === PANEL_GET) return Promise.resolve(lastState)
  if (message.type === PANEL_COMMAND && isPanelCommand(message.command)) handleCommand?.(message.command)
})

/** Сам content script панель открыть не может: жест доезжает до background сообщением */
export function requestPanelOpen(): void {
  void browser.runtime.sendMessage({ type: PANEL_OPEN }).catch(() => undefined)
}

/** Панель открыта и смотрит на эту вкладку: её порт жив — кнопку открытия можно спрятать */
export const isPanelOpen: Ref<boolean> = ref(false)

browser.runtime.onConnect.addListener((port) => {
  if (port.name !== PANEL_PORT) return

  isPanelOpen.value = true
  port.onDisconnect.addListener(() => {
    isPanelOpen.value = false
  })
})
