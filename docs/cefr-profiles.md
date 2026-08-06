# Как добавить офлайн-профиль CEFR для другого языка

Сейчас в расширение встроен список уровней только для английского:
`src/utils/cefr/wordLevels.data.ts` — 8833 слова и словосочетания, 75 КБ, собран
`scripts/buildCefrList.mjs` из CEFR-J Vocabulary Profile (A1–B2) и Octanove Profile (C1/C2).

Он делает две вещи:

1. **Страхует от завышенных уровней.** Слово, которое список относит строго ниже уровня
   читателя, выбрасывается из ответа модели (`reviewWords` в `utils/cefr/levels.ts`).
2. **Проставляет уровень** тем словам, которые перевела не модель, а словарь или машинный
   переводчик, — иначе запись выпадает из фильтра по уровню на экране словаря.

Ниже — что нужно сделать, чтобы то же самое заработало для немецкого, испанского или
любого другого языка оригинала.

## Шаг 0. Найти данные и проверить лицензию

Репозиторий публичный и под GPL-3.0, поэтому данные должны допускать распространение
в составе форка. Проверяйте лицензию сами: у профилей CEFR она разная и часто нетривиальная.

Отправные точки:

| Язык | Кандидат | Замечание |
| --- | --- | --- |
| Английский | [CEFR-J + Octanove](https://github.com/openlanguageprofiles/olp-en-cefrj) | уже встроен |
| Немецкий | Profile Deutsch, Goethe-Zertifikat Wortlisten | списки к экзаменам публикуются в PDF, лицензия ограничена — уточняйте |
| Испанский | Plan Curricular del Instituto Cervantes | инвентари по уровням, лицензия ограничена |
| Французский | Référentiels DELF / Le français fondamental | то же |
| Любой | частотные списки (OpenSubtitles, Wortschatz Leipzig, Kelly project) | лицензии обычно свободнее |

**Если готового CEFR-профиля нет** — годится частотный список: разбейте его на шесть частей
по рангу (первые ~1000 лемм → A1, следующие ~1000 → A2 и так далее) и получите грубую, но
рабочую шкалу. Для обеих задач выше этого достаточно: важно отличить «читатель это
наверняка знает» от «вряд ли».

Атрибуцию положите в раздел «Лицензия» в [README](../README.md) рядом с существующей —
это требование и CEFR-J, и CC BY-SA.

## Шаг 1. Собрать файл данных

`scripts/buildCefrList.mjs` заточен под конкретные CSV: колонки `headword,pos,CEFR`,
варианты написания через `/`, минимальный уровень при нескольких частях речи.

Скопируйте его под свой источник (или добавьте разбор рядом) и поменяйте две вещи:

```js
const OUT = new URL('../src/utils/cefr/wordLevels.de.data.ts', import.meta.url)
// и фильтр допустимых символов: `/^[a-z][a-z' -]*$/` отсечёт умляуты и диакритику
if (!word || !/^\p{Ll}[\p{Ll}' -]*$/u.test(word)) continue
```

Формат результата менять не нужно — слова хранятся строкой через запятую на уровень:

```ts
export const CEFR_WORDS: Record<string, string> = {
  A1: 'aber,alle,alt,...',
  A2: '...',
}
```

Объект `{ "wort": "A1" }` на 9000 ключей весит вдвое больше на одних кавычках, а разбор
строки стоит доли миллисекунды и происходит один раз за сессию.

Ориентир по размеру: 8–10 тысяч слов ≈ 75 КБ, отдельным чанком ≈ 31 КБ в gzip.

## Шаг 2. Научить загрузчик выбирать язык

Сейчас `utils/cefr/levels.ts` импортирует единственный файл:

```ts
let cache: Promise<Map<string, CefrLevel>> | undefined

async function knownLevels(): Promise<Map<string, CefrLevel>> {
  cache ??= import('./wordLevels.data').then(({ CEFR_WORDS }) => { /* … */ })

  return cache
}

export async function cefrLevel(term: string): Promise<CefrLevel | undefined>
```

Станет — карта «язык → загрузчик» и кэш по языку:

```ts
/** Импорты перечисляются статически: динамический путь бандлер не разложит на чанки */
const PROFILES: Record<string, () => Promise<{ CEFR_WORDS: Record<string, string> }>> = {
  en: () => import('./wordLevels.data'),
  de: () => import('./wordLevels.de.data'),
}

export function hasProfile(lang: string): boolean {
  return lang in PROFILES
}

const cache = new Map<string, Promise<Map<string, CefrLevel>>>()

export async function cefrLevel(term: string, lang: string): Promise<CefrLevel | undefined>
```

`import()` с переменной в пути (``import(`./wordLevels.${lang}.data`)``) не годится:
@crxjs прописывает граф импортов в манифест при старте, а вычисляемый путь в этот граф
не попадёт — content script упадёт с `Failed to fetch dynamically imported module`.

## Шаг 3. Убрать проверку `=== 'en'` из двух мест

`src/utils/llmClient.ts:88` — отсев после разбора:

```ts
return sourceLang === 'en' ? reviewWords(parseWords(content), level) : parseWords(content)
// →
return hasProfile(sourceLang) ? reviewWords(parseWords(content), level, sourceLang) : parseWords(content)
```

`src/utils/translateTerm.ts:19` — подстановка уровня:

```ts
if (sourceLang !== 'en') return word
// →
if (!hasProfile(sourceLang)) return word
```

Больше нигде язык не зашит: `reviewWord`, `isBelow` и экран словаря о профилях не знают.

## Шаг 4. Формы слов

`utils/cefr/forms.ts` снимает английские окончания (-s/-es/-ies/-ed/-ing/-er/-est/-ly
и удвоенную согласную). Для немецкого или русского это бесполезно, а местами вредно.

Минимум: своя таблица правил на язык и выбор по тому же ключу, что у профиля.

```ts
const RULES: Record<string, { suffix: string; endings: string[] }[]> = { en: […], de: […] }
```

Для языков с богатой морфологией правилами не обойтись — тогда либо словарь форм
(«forma → лемма») прямо в файле данных, либо готовый лемматизатор. Второе дороже:
это ещё одна зависимость в content script.

Промах в формах не ломает ничего: слово просто не находится в списке и проходит дальше
как незнакомое. Это дешевле, чем ложный отсев.

## Шаг 5. Проверить

```bash
node scripts/buildCefrList.de.mjs   # сколько слов собралось
npm test                            # forms + reviewWord
npm run typecheck
```

Разовая проверка на живых данных (файл временный, в репозиторий не идёт):

```ts
import { cefrLevel } from './src/utils/cefr/levels'
for (const word of ['Schwert', 'laufen', 'Zauberei']) console.info(word, await cefrLevel(word, 'de'))
```

И главное — прод-сборка: чанк профиля должен попасть в `web_accessible_resources`,
иначе content script не сможет его импортировать.

```bash
npm run build
python3 -c "import json; m=json.load(open('dist/chrome/manifest.json')); \
print([r for e in m['web_accessible_resources'] for r in e['resources'] if 'wordLevels' in r])"
```

В dev-режиме после появления нового модуля обязателен перезапуск `npm run dev:chrome` —
граф импортов пишется в манифест при старте.

## Чек-лист

- [ ] лицензия источника допускает распространение, атрибуция добавлена в README;
- [ ] файл данных собран скриптом, а не руками, скрипт лежит в `scripts/`;
- [ ] профиль зарегистрирован в `PROFILES`, путь импорта статический;
- [ ] проверки `=== 'en'` заменены на `hasProfile`;
- [ ] правила форм для языка есть или сознательно пропущены;
- [ ] `npm test`, `npm run typecheck`, `npm run lint` зелёные;
- [ ] чанк профиля виден в `web_accessible_resources` прод-сборки.
