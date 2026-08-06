import browser from 'webextension-polyfill'

/** Словарь живёт разделом страницы настроек — открывается по её адресу с маршрутом */
export const DICTIONARY_URL = 'src/ui/options-page/index.html?route=/options-page/dictionary'

/**
 * Открыть словарь новой вкладкой. Просим об этом background: в content script
 * `browser.tabs` нет, а адрес не передаём — страница сайта не должна уметь
 * открывать через нас что угодно.
 */
export function openDictionaryTab(): void {
  void browser.runtime.sendMessage({ type: 'ui/open-dictionary' })
}
