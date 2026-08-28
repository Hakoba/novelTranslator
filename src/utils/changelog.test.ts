import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseTopSection, splitItem } from './changelog'

const MARKDOWN = `# Change Log

## Не выпущено

## 1.1.0

### Исправлено

- Первый пункт с переносом
  и хвостом в \`коде\`

### Добавлено

- Ссылка на [доки](https://example.com)

## 1.0.0

### Добавлено

- Старое, показывать не надо
`

test('parseTopSection: пустой раздел пропускается, группы идут от нового к починкам', () => {
  const section = parseTopSection(MARKDOWN)

  assert.equal(section?.title, '1.1.0')
  assert.deepEqual(section?.groups, [
    { kind: 'added', title: 'Добавлено', items: [{ title: 'Ссылка на доки', details: '' }] },
    {
      kind: 'fixed',
      title: 'Исправлено',
      items: [{ title: 'Первый пункт с переносом и хвостом в коде', details: '' }],
    },
  ])
})

test('parseTopSection: без разделов и без пунктов — ничего', () => {
  assert.equal(parseTopSection('# Change Log\n'), undefined)
  assert.equal(parseTopSection('## 1.0.0\n\n### Добавлено\n'), undefined)
})

test('splitItem: суть отделяется двоеточием и тире', () => {
  assert.deepEqual(splitItem('Тёмная тема в оверлее: класс .dark ставится внутри'), {
    title: 'Тёмная тема в оверлее',
    details: 'класс .dark ставится внутри',
  })
  assert.deepEqual(splitItem('Расширение звалось «Vite» — шаблонное имя из заготовки'), {
    title: 'Расширение звалось «Vite»',
    details: 'шаблонное имя из заготовки',
  })
})

test('splitItem: разделитель внутри скобок и кавычек не рвёт заголовок', () => {
  assert.deepEqual(splitItem('Подсказки к кнопкам (CSS-тултип: Dialog вне shadow root)'), {
    title: 'Подсказки к кнопкам (CSS-тултип: Dialog вне shadow root)',
    details: '',
  })
})

test('splitItem: точка тоже делит пункт', () => {
  const long = `UI переведён на PrimeVue и Tailwind, старые зависимости удалены. Шаблонный i18n тогда же выпилили — вернули позже своими локалями`

  assert.deepEqual(splitItem(long), {
    title: 'UI переведён на PrimeVue и Tailwind, старые зависимости удалены',
    details: 'Шаблонный i18n тогда же выпилили — вернули позже своими локалями',
  })
})

test('splitItem: короткий пункт остаётся целым', () => {
  assert.deepEqual(splitItem('Сайт по умолчанию'), { title: 'Сайт по умолчанию', details: '' })
})
