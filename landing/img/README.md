# Скриншоты лендинга и README

Кадры для `landing/index.html` и для обоих README. Снимать в светлой теме, ретина
(двойной размер), формат PNG. После того как файл лёг сюда, в `index.html` найти
комментарий «СКРИНШОТ N» и заменить блок `<div class="shot">…</div>` на строку
из комментария; в `README.md` и `README.ru.md` — заменить блок с курсивной строкой
«Скриншоты готовятся» на разметку из комментария над ним.

`overlay.png` идёт первым экраном в оба README, поэтому он важнее остальных: это
единственная картинка, которую увидит человек, пришедший из поиска GitHub. На нём
должно быть видно и подсветку в тексте, и панель со списком — то есть весь продукт
одним кадром.

| Файл             | Размер    | Что в кадре                                                                                                                                        |
| ---------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `overlay.png`    | 1600×1200 | Страница с текстом (глава, статья или тред на Reddit), оверлей развёрнут со списком слов, в тексте видна подсветка обоих цветов. Одна карточка раскрыта с переводом и уровнем. |
| `dictionary.png` | 1400×900  | Экран словаря (`/options-page/dictionary`): 8-12 записей, видны поиск, фильтр по уровню и сортировка.                                                 |

Полезно, но не обязательно: попап с кнопкой «Разрешить домен» и раздел настроек
«Модель» с зелёным результатом проверки подключения. Под них в вёрстке слотов нет,
добавлю, если кадры появятся.

## Логотип

Текущая иконка досталась от шаблона `vite-vue3-browser-extension-v3` и к продукту
отношения не имеет. Идея замены: подсвеченная маркером строка текста, то есть ровно то,
что расширение делает со страницей. Читается на 16px в панели браузера, работает
и на светлой, и на тёмной теме, потому что марка живёт на своей плашке.

Промт на английском: изобразительные модели на нём точнее.

**Вариант 1, основной. Строки текста и мазок маркера**

```text
Flat vector app icon on a rounded square badge, corner radius about 22 percent
of the width, solid deep ink background #22282A, generous even padding.
Centered inside: three short horizontal rounded bars stacked with equal spacing,
suggesting lines of text, in warm off-white #F2EFE7, thick and bold.
Behind the middle bar sits a solid amber rounded rectangle #EEBD4A, a marker
swipe, taller than the bar and wider than the left half of it, extending
slightly past the bar on the left. Where the bar crosses the amber swipe the bar
is dark ink #22282A, so it reads as text sitting on a highlighter mark.
Geometric, symmetrical, perfectly centered, solid flat colors only.
No letters, no words, no numbers, no gradients, no shadows, no 3D, no texture,
no outline strokes, no photorealism. Designed to stay legible at 16 pixels.
Square image, 1024x1024.
```

**Вариант 2, запасной. Буквенная марка**

```text
Flat vector app icon on a rounded square badge, corner radius about 22 percent
of the width, solid warm off-white background #F2EFE7, generous even padding.
Centered: a single bold geometric letter N in deep ink #22282A, heavy grotesque
sans serif, flat and clean. A solid amber rounded rectangle #EEBD4A runs behind
the lower two thirds of the letter like a highlighter swipe, extending slightly
past the letter on both sides. Solid flat colors only, exactly three colors.
No extra letters, no words, no gradients, no shadows, no 3D, no texture,
no photorealism. Designed to stay legible at 16 pixels. Square image, 1024x1024.
```

Что проверить у результата: три цвета и не больше, силуэт узнаётся, если уменьшить
картинку до 16px, между плашкой и содержимым остаются поля, внутри нет мелких деталей
и тонких линий.

Готовый файл нужен квадратный PNG 800×800 или больше. Замена идёт в трёх местах:
`src/assets/logo.png` (иконка расширения из манифеста), `public/logo.png` (фавиконка
попапа и страницы установки), `landing/logo.png` (шапка и фавиконка лендинга).
