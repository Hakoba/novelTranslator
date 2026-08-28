import browser from 'webextension-polyfill'
import type { WordWithExplanation } from '@/types/words'

/**
 * Протокол боковой панели Chrome. Живое состояние разбора есть только у оверлея
 * в content script, а рисует его страница панели — между ними ходят сообщения:
 * оверлей публикует снимок (`PANEL_STATE`), панель спрашивает текущий (`PANEL_GET`)
 * и шлёт команды (`PANEL_COMMAND`). Словарь и настройки сюда не входят: они лежат
 * в storage и реактивны в обоих контекстах сами по себе.
 */
export const PANEL_STATE = 'nt/panel-state'
export const PANEL_GET = 'nt/panel-get'
export const PANEL_COMMAND = 'nt/panel-command'
/** Кнопка на странице просит background открыть панель: жест доезжает через сообщение */
export const PANEL_OPEN = 'nt/panel-open'
/**
 * Порт «панель → вкладка»: пока панель открыта и смотрит на вкладку, порт жив,
 * и оверлей прячет кнопку открытия. Закрыли панель — порт рвётся сам.
 */
export const PANEL_PORT = 'nt-panel'

/** Снимок состояния разбора; `null` — оверлея на странице нет */
export interface PanelState {
  isStarted: boolean
  isLoading: boolean
  isPicking: boolean
  hasArea: boolean
  isImmersionActive: boolean
  immersionCount: number
  errorMessage: string
  /** Разобранный текст: из него панель берёт предложение-контекст и материал для пояснений */
  sourceText: string
  /** Найденные слова уже без сохранённых и скрытых */
  words: WordWithExplanation[]
  /** Нормализованные термины, найденные в тексте страницы: у них есть кнопка перехода */
  onPage: string[]
  /** Сколько нашлось до фильтра: различает «всё знакомо» и «ничего не нашлось» */
  totalWords: number
}

/** Команды панели оверлею — всё, что требует DOM страницы */
export type PanelCommand =
  | { command: 'analyze'; full: boolean }
  | { command: 'reveal'; term: string }
  | { command: 'pickArea' }
  | { command: 'resetArea' }

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isPanelCommand(value: unknown): value is PanelCommand {
  if (!isRecord(value)) return false
  if (value.command === 'analyze') return typeof value.full === 'boolean'
  if (value.command === 'reveal') return typeof value.term === 'string'

  return value.command === 'pickArea' || value.command === 'resetArea'
}

/** Снимку хватает поверхностной проверки: обе стороны сообщения — наш же код */
export function isPanelState(value: unknown): value is PanelState {
  return isRecord(value) && Array.isArray(value.words)
}

/** Снимок из сообщения `PANEL_STATE`; `undefined` — сообщение не про панель */
export function panelStateFromMessage(message: unknown): PanelState | null | undefined {
  if (!isRecord(message) || message.type !== PANEL_STATE) return undefined

  return isPanelState(message.state) ? message.state : null
}

export function sendPanelCommand(tabId: number, command: PanelCommand): void {
  void browser.tabs.sendMessage(tabId, { type: PANEL_COMMAND, command }).catch(() => undefined)
}

/** `null` и на отказ: на страницах без content script (chrome://, стор) сообщение не доставляется */
export async function requestPanelState(tabId: number): Promise<PanelState | null> {
  try {
    const state: unknown = await browser.tabs.sendMessage(tabId, { type: PANEL_GET })

    return isPanelState(state) ? state : null
  } catch {
    return null
  }
}
