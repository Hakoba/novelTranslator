import { watch } from 'vue'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en'
import ru from '@/locales/ru'
import es from '@/locales/es'
import pt from '@/locales/pt'
import zh from '@/locales/zh'
import ko from '@/locales/ko'
import { useReaderSettings } from '@/composables/useReaderSettings'
import { defaultUiLanguage, isUiLanguage } from '@/utils/languages'
import { pluralIndex } from '@/utils/plural'

export const i18n = createI18n({
  // Composition API: legacy-режим тянет за собой глобальный this и лишний код в бандл
  legacy: false,
  locale: defaultUiLanguage(),
  // английский понятен шире прочих: незнакомый язык и пропущенный ключ уводим туда
  fallbackLocale: 'en',
  messages: { en, ru, es, pt, zh, ko },
  // у vue-i18n две формы на язык: русскому нужно три, корейскому и китайскому — одна
  // (в их локалях просто нет ветки `|`, и правило не применяется)
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
