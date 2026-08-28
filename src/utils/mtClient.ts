import type { DictSettings } from '@/composables/useDictSettings'
import type { MachineTranslatorId, TranslatorCredentials } from '@/utils/mt/translators'
import { getDictSettings } from '@/composables/useDictSettings'
import { getReaderSettings } from '@/composables/useReaderSettings'
import { sendBgFetch } from '@/utils/bgFetch'
import { EDGE_AUTH_URL, getTranslator } from '@/utils/mt/translators'
import { t } from '@/utils/i18n'

/** Токен Edge живёт десять минут; берём с запасом, чтобы протухший не ушёл в запрос */
const EDGE_TOKEN_TTL = 9 * 60 * 1000

let edgeToken: { value: string; expires: number } | undefined

/**
 * Анонимный токен для переводчика Edge: ключа и регистрации сервис не просит,
 * но каждый запрос подписывает. За токеном ходим раз в девять минут, а не на слово.
 */
async function getEdgeToken(): Promise<string> {
  if (edgeToken && edgeToken.expires > Date.now()) return edgeToken.value

  const res = await sendBgFetch(EDGE_AUTH_URL, { method: 'GET' })
  // токен приходит голым JWT в text/plain, а не полем в JSON
  const value = res.ok && typeof res.data === 'string' ? res.data.trim() : ''
  if (!value) return ''

  edgeToken = { value, expires: Date.now() + EDGE_TOKEN_TTL }

  return value
}

/** Каждому переводчику своё поле в настройках; общий у них только вид credentials */
function credentialsFor(id: MachineTranslatorId, settings: DictSettings): TranslatorCredentials {
  const empty = { baseUrl: '', apiKey: '', region: '' }

  switch (id) {
    case 'mymemory': return { ...empty, apiKey: settings.myMemoryEmail.trim() }
    case 'lingva': return { ...empty, baseUrl: settings.lingvaUrl }
    case 'deepl': return { ...empty, apiKey: settings.deeplKey }
    case 'azure': return { apiKey: settings.azureKey, region: settings.azureRegion.trim(), baseUrl: '' }
    case 'libre': return { ...empty, baseUrl: settings.libreUrl, apiKey: settings.libreKey }
    default: return empty
  }
}

/**
 * Перевод фразы машинным переводчиком. Пустая строка — «не настроен или не смог»,
 * вызывающий в этом случае идёт к модели. Отказ по ключу пробрасывается ошибкой:
 * молча откатываться на платную модель при опечатке в ключе — плохая услуга.
 */
export async function machineTranslate(term: string): Promise<string> {
  const settings = await getDictSettings()
  const adapter = getTranslator(settings.translator)
  if (!adapter) return ''

  const credentials = credentialsFor(adapter.id, settings)

  if (adapter.requiresKey && !credentials.apiKey) return ''
  if (adapter.requiresUrl && !credentials.baseUrl) return ''

  if (adapter.id === 'edge') {
    credentials.apiKey = await getEdgeToken()
    if (!credentials.apiKey) return ''
  }

  const { sourceLang, targetLang } = await getReaderSettings()
  const { url, method, headers, body } = adapter.buildRequest(term, sourceLang, targetLang, credentials)
  const res = await sendBgFetch(url, { method, headers, body })

  if (res.status === 401 || res.status === 403) {
    // ключ ввёл пользователь — про отказ надо сказать; у переводчиков без ключа
    // это протухший или отозванный токен, и правильный ответ — молча уйти к модели
    if (adapter.requiresKey) throw new Error(t('errors.translatorKeyRejected', { title: adapter.title }))
    edgeToken = undefined

    return ''
  }
  if (!res.ok) return ''

  return adapter.extractText(res.data).trim()
}
