export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const

export type CefrLevel = (typeof CEFR_LEVELS)[number]

export type WordWithExplanation = {
  original: string
  translate: string
  explanation?: string
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
}
