// Ссылки на внешние словари. Без запросов и ключей — просто адреса.

import { languageName } from '@/utils/languages'

export type DictLink = {
  id: string
  title: string
  url: string
}

export type LinkLangs = {
  source: string
  target: string
}

type Target = {
  id: string
  title: string
  build: (term: string, langs: LinkLangs) => string
  /** Словарь знает не любую пару — лишнюю ссылку лучше не показывать */
  fits?: (langs: LinkLangs) => boolean
}

/** Reverso держит пару в адресе словами: context.reverso.net/translation/english-russian/… */
function reversoPair({ source, target }: LinkLangs): string {
  return `${languageName(source).toLowerCase()}-${languageName(target).toLowerCase()}`
}

/** Короткие подписи: ссылки стоят в ряд в узкой панели оверлея */
const TARGETS: Target[] = [
  {
    id: 'google',
    title: 'Google',
    build: (term, { source, target }) =>
      `https://translate.google.com/?sl=${source}&tl=${target}&op=translate&text=${term}`,
  },
  {
    id: 'yandex',
    title: 'Яндекс',
    build: (term, { source, target }) =>
      `https://translate.yandex.ru/?source_lang=${source}&target_lang=${target}&text=${term}`,
  },
  {
    id: 'reverso',
    title: 'Reverso',
    build: (term, langs) => `https://context.reverso.net/translation/${reversoPair(langs)}/${term}`,
  },
  {
    id: 'multitran',
    title: 'Мультитран',
    // коды языков у Мультитрана свои, числовые, поэтому оставляем только пару, в которой уверены
    fits: ({ source, target }) => source === 'en' && target === 'ru',
    build: (term) => `https://www.multitran.com/m.exe?l1=1&l2=2&s=${term}`,
  },
  {
    id: 'wiktionary',
    title: 'Wiktionary',
    // английский раздел полнее прочих и разбирает слова любого языка
    build: (term) => `https://en.wiktionary.org/wiki/${term}`,
  },
]

export function dictionaryLinks(term: string, langs: LinkLangs): DictLink[] {
  const trimmed = term.trim()
  if (!trimmed) return []

  const encoded = encodeURIComponent(trimmed)

  return TARGETS
    .filter(({ fits }) => !fits || fits(langs))
    .map(({ id, title, build }) => ({ id, title, url: build(encoded, langs) }))
}
