/** Что в настройках недозаполнено. Без браузерных API — тестируется в node. */

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]']

/** Облачный адрес без ключа заведомо не ответит; локальный сервер ключа не требует */
export function needsApiKey(baseUrl: string, apiKey: string): boolean {
  if (apiKey.trim()) return false

  try {
    const { hostname } = new URL(baseUrl)

    return !LOCAL_HOSTS.includes(hostname) && !hostname.endsWith('.local')
  } catch {
    // адрес пустой или кривой — об этом скажет проверка подключения, а не бейдж «нужен ключ»
    return false
  }
}
