import browser from 'webextension-polyfill'
import contentScript from '@/content-script/index.ts?script'

const SCRIPT_ID = 'erudit-sites'

/**
 * Content script внедряется только туда, куда есть доступ. В манифесте доступ
 * узкий (reddit и словари), остальные сайты читатель разрешает сам через
 * `permissions.request`, и список внедрения собирается из выданных разрешений.
 * Регистрация переживает перезапуск браузера, но не обновление расширения —
 * поэтому зовётся и из `onInstalled`.
 */
export async function syncSiteScripts(): Promise<void> {
  const { origins = [] } = await browser.permissions.getAll()
  const [registered] = await browser.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] })

  if (!origins.length) {
    if (registered) await browser.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] })
    return
  }

  const script = { id: SCRIPT_ID, js: [contentScript], matches: origins, runAt: 'document_end' as const, allFrames: false }
  if (registered) await browser.scripting.updateContentScripts([script])
  else await browser.scripting.registerContentScripts([script])

  console.info('[nt] content script на сайтах:', origins.length)
}
