export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const

export type CefrLevel = (typeof CEFR_LEVELS)[number]

export type WordWithExplanation = {
  original: string
  translate: string
  explanation?: string
  level?: CefrLevel
}

/**
 * Вкрапление для списка в панели: слово словаря, которым подменили текст, и та
 * словоформа, что стояла на её месте. Плоский вид, а не `ImmersionMatch`: список
 * рисуется и в боковой панели, куда запись словаря целиком не нужна.
 */
export type ImmersionWord = {
  original: string
  translate: string
  /** Слово, которое стояло в тексте до подмены */
  form: string
  level?: CefrLevel
}

/**
 * Запись словаря. `id`, `updatedAt` и `deletedAt` заложены под возможную
 * синхронизацию с сервером: без стабильного id записи нечего сопоставлять,
 * без updatedAt нечем разрешить конфликт двух устройств, а без deletedAt
 * удаление не доедет никогда — второе устройство вернёт слово обратно.
 */
export type DictionaryEntry = {
  id: string
  original: string
  translate: string
  /** Предложение, в котором слово встретилось */
  context?: string
  explanation?: string
  level?: CefrLevel
  addedAt: number
  updatedAt: number
  /** Мягкое удаление: запись остаётся в хранилище как надгробие */
  deletedAt?: number

  // интервальные повторения; пусто — слово ещё ни разу не тренировали
  /** Когда показать в следующий раз */
  dueAt?: number
  /** Текущий шаг в лестнице интервалов */
  intervalStep?: number
  reviews?: number
  lapses?: number
}
