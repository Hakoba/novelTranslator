export interface SettledOutcome<T> {
  values: T[]
  /** Заполняется, только когда не уцелело ни одно значение: отвалился сам источник, а не слово */
  error?: string
}

/**
 * Разбор переводит найденные слова пачкой, и отказ переводчика приходит сразу на
 * каждое слово: отклонённый ключ, кончившаяся квота, упавший сервер. Уровень и
 * подсветка от перевода не зависят, поэтому слово с упавшим переводом остаётся
 * в списке как есть — иначе одна ошибка стирает с экрана весь разбор. Про общий
 * отказ читателю говорят сообщением рядом со списком, а не пустым списком.
 */
export function unwrapSettled<T>(settled: PromiseSettledResult<T>[], fallback: T[]): SettledOutcome<T> {
  const rejected = settled.filter((item): item is PromiseRejectedResult => item.status === 'rejected')
  const values = settled.map((item, index) => (item.status === 'fulfilled' ? item.value : fallback[index]))

  if (rejected.length === 0 || rejected.length !== settled.length) return { values }

  const [{ reason }] = rejected

  return { values, error: reason instanceof Error ? reason.message : String(reason) }
}
