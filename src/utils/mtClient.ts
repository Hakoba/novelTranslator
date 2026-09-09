import type { DictSettings } from '@/composables/useDictSettings'
import type { MachineTranslatorId, Translator, TranslatorCredentials } from '@/utils/mt/translators'
import { getDictSettings } from '@/composables/useDictSettings'
import { getReaderSettings } from '@/composables/useReaderSettings'
import { sendBgFetch } from '@/utils/bgFetch'
import { EDGE_AUTH_URL, getTranslator } from '@/utils/mt/translators'
import { t } from '@/utils/i18n'
import { normalizeTerm } from '@/utils/dictionary'

/**
 * Ответы на время жизни страницы: разбор на каждом заходе шлёт одни и те же слова,
 * а неофициальные точки режут по частоте. Пустой ответ не кэшируем — это отказ,
 * а не перевод, и повторить его стоит.
 */
const cache = new Map<string, string>()

function cacheKey(translator: string, source: string, target: string, term: string): string {
  return `${translator}:${source}-${target}:${normalizeTerm(term)}`
}

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
export function credentialsFor(id: MachineTranslatorId, settings: DictSettings): TranslatorCredentials {
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

interface ReadyTranslator {
  adapter: Translator
  credentials: TranslatorCredentials
  sourceLang: string
  targetLang: string
}

/** Выбранный переводчик с ключами и парой языков; `undefined` — не настроен */
async function readyTranslator(): Promise<ReadyTranslator | undefined> {
  const settings = await getDictSettings()
  const adapter = getTranslator(settings.translator)
  if (!adapter) return undefined

  const credentials = credentialsFor(adapter.id, settings)

  if (adapter.requiresKey && !credentials.apiKey) return undefined
  if (adapter.requiresUrl && !credentials.baseUrl) return undefined

  if (adapter.id === 'edge') {
    credentials.apiKey = await getEdgeToken()
    if (!credentials.apiKey) return undefined
  }

  const { sourceLang, targetLang } = await getReaderSettings()

  return { adapter, credentials, sourceLang, targetLang }
}

/** Общий транспорт: отказ по ключу — ошибкой, остальные отказы — `undefined` */
async function send(
  { adapter }: ReadyTranslator,
  { url, method, headers, body }: ReturnType<Translator['buildRequest']>,
): Promise<unknown> {
  const res = await sendBgFetch(url, { method, headers, body })

  if (res.status === 401 || res.status === 403) {
    // ключ ввёл пользователь — про отказ надо сказать; у переводчиков без ключа
    // это протухший или отозванный токен, и правильный ответ — молча уйти к модели
    if (adapter.requiresKey) throw new Error(t('errors.translatorKeyRejected', { title: adapter.title }))
    edgeToken = undefined

    return undefined
  }

  return res.ok ? res.data : undefined
}

/**
 * Перевод фразы машинным переводчиком. Пустая строка — «не настроен или не смог»,
 * вызывающий в этом случае идёт к модели. Отказ по ключу пробрасывается ошибкой:
 * молча откатываться на платную модель при опечатке в ключе — плохая услуга.
 */
export async function machineTranslate(term: string): Promise<string> {
  const ready = await readyTranslator()
  if (!ready) return ''

  const { adapter, credentials, sourceLang, targetLang } = ready
  const key = cacheKey(adapter.id, sourceLang, targetLang, term)
  const cached = cache.get(key)
  if (cached) return cached

  const data = await send(ready, adapter.buildRequest(term, sourceLang, targetLang, credentials))
  const text = data === undefined ? '' : adapter.extractText(data).trim()
  if (text) cache.set(key, text)

  return text
}

/**
 * Пачка слов одним запросом — только для переводчика с `batch`; остальным
 * вызывающий шлёт слова по одному. Ответ по позициям запроса; пустая строка — «не смог».
 */
export async function machineTranslateMany(terms: string[]): Promise<string[]> {
  const ready = await readyTranslator()
  const batch = ready?.adapter.batch
  if (!ready || !batch) return terms.map(() => '')

  const { adapter, credentials, sourceLang, targetLang } = ready

  const results = terms.map((term) => cache.get(cacheKey(adapter.id, sourceLang, targetLang, term)) ?? '')
  const pending = terms.filter((_, index) => !results[index])
  if (!pending.length) return results

  const data = await send(ready, batch.build(pending, sourceLang, targetLang, credentials))
  const texts = data === undefined ? [] : batch.extract(data, pending.length)

  pending.forEach((term, index) => {
    const text = (texts[index] ?? '').trim()
    if (!text) return

    cache.set(cacheKey(adapter.id, sourceLang, targetLang, term), text)
    results[terms.indexOf(term)] = text
  })

  return results
}
