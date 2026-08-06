import { watch } from 'vue'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en'
import ru from '@/locales/ru'
import { useReaderSettings } from '@/composables/useReaderSettings'
import { pluralIndex } from '@/utils/plural'

/** Интерфейс переведён не на все языки, между которыми расширение переводит текст */
export type UiLanguage = 'ru' | 'en'


export const UI_LANGUAGES: { code: UiLanguage; native: string }[] = [
  { code: 'ru', native: 'Русский' },
  { code: 'en', native: 'English' },
]

export function isUiLanguage(code: string): code is UiLanguage {
  return UI_LANGUAGES.some((item) => item.code === code)
}

export const i18n = createI18n({
  // Composition API: legacy-режим тянет за собой глобальный this и лишний код в бандл
  legacy: false,
  locale: 'ru',
  fallbackLocale: 'en',
  messages: { ru, en },
  // у vue-i18n две формы на язык, русскому нужно три
  pluralRules: { ru: pluralIndex },
})

/** Короткий доступ из не-Vue кода: клиенты моделей и словарей тоже показывают текст */
export const t = i18n.global.t

const { settings } = useReaderSettings()

// настройки приезжают из storage уже после старта, поэтому не разовое присваивание
watch(
  () => settings.value.uiLang,
  (lang) => {
    if (isUiLanguage(lang)) i18n.global.locale.value = lang
  },
  { immediate: true },
)
