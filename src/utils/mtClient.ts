import { getDictSettings } from '@/composables/useDictSettings'
import { getReaderSettings } from '@/composables/useReaderSettings'
import { sendBgFetch } from '@/utils/bgFetch'
import { getTranslator } from '@/utils/mt/translators'
import { t } from '@/utils/i18n'

/**
 * Перевод фразы машинным переводчиком. Пустая строка — «не настроен или не смог»,
 * вызывающий в этом случае идёт к модели. Отказ по ключу пробрасывается ошибкой:
 * молча откатываться на платную модель при опечатке в ключе — плохая услуга.
 */
export async function machineTranslate(term: string): Promise<string> {
  const { translator, deeplKey, libreUrl, libreKey } = await getDictSettings()
  const adapter = getTranslator(translator)
  if (!adapter) return ''

  const credentials = adapter.id === 'deepl'
    ? { baseUrl: '', apiKey: deeplKey }
    : { baseUrl: libreUrl, apiKey: libreKey }

  if (adapter.requiresKey && !credentials.apiKey) return ''
  if (adapter.id === 'libre' && !credentials.baseUrl) return ''

  const { sourceLang, targetLang } = await getReaderSettings()
  const { url, headers, body } = adapter.buildRequest(term, sourceLang, targetLang, credentials)
  const res = await sendBgFetch(url, { method: 'POST', headers, body })

  if (res.status === 401 || res.status === 403) {
    throw new Error(t('errors.translatorKeyRejected', { title: adapter.title }))
  }
  if (!res.ok) return ''

  return adapter.extractText(res.data).trim()
}
