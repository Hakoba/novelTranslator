// Ссылки на внешние словари. Без запросов и ключей — просто адреса.

export type DictLink = {
  id: string
  title: string
  url: string
}

/** Короткие подписи: ссылки стоят в ряд в узкой панели оверлея */
const TARGETS: { id: string; title: string; build: (term: string) => string }[] = [
  {
    id: 'google',
    title: 'Google',
    build: (term) => `https://translate.google.com/?sl=en&tl=ru&op=translate&text=${term}`,
  },
  {
    id: 'yandex',
    title: 'Яндекс',
    build: (term) => `https://translate.yandex.ru/?source_lang=en&target_lang=ru&text=${term}`,
  },
  {
    id: 'reverso',
    title: 'Reverso',
    build: (term) => `https://context.reverso.net/translation/english-russian/${term}`,
  },
  {
    id: 'multitran',
    title: 'Мультитран',
    build: (term) => `https://www.multitran.com/m.exe?l1=1&l2=2&s=${term}`,
  },
  {
    id: 'wiktionary',
    title: 'Wiktionary',
    build: (term) => `https://en.wiktionary.org/wiki/${term}`,
  },
]

export function dictionaryLinks(term: string): DictLink[] {
  const trimmed = term.trim()
  if (!trimmed) return []

  const encoded = encodeURIComponent(trimmed)

  return TARGETS.map(({ id, title, build }) => ({ id, title, url: build(encoded) }))
}
