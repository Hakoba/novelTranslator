import browser from 'webextension-polyfill'

/**
 * Просьба к background пересобрать список сайтов, куда внедряется content script,
 * по выданным разрешениям. Шлётся сразу после `permissions.request`: страницу
 * перезагружают тут же, и ждать `permissions.onAdded` в фоне было бы гонкой.
 */
export const SCRIPTS_SYNC = 'nt/scripts-sync'

export async function requestScriptsSync(): Promise<void> {
  await browser.runtime.sendMessage({ type: SCRIPTS_SYNC })
}
