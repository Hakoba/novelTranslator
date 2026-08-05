// Схема коллекции Anki (legacy schema 11) — её понимают все версии Anki 2.1+.
// Вынесено отдельно: это данные формата, а не логика экспорта.

export const CREATE_TABLES = `
CREATE TABLE col (
  id integer primary key, crt integer not null, mod integer not null,
  scm integer not null, ver integer not null, dty integer not null,
  usn integer not null, ls integer not null, conf text not null,
  models text not null, decks text not null, dconf text not null, tags text not null
);
CREATE TABLE notes (
  id integer primary key, guid text not null, mid integer not null,
  mod integer not null, usn integer not null, tags text not null,
  flds text not null, sfld integer not null, csum integer not null,
  flags integer not null, data text not null
);
CREATE TABLE cards (
  id integer primary key, nid integer not null, did integer not null,
  ord integer not null, mod integer not null, usn integer not null,
  type integer not null, queue integer not null, due integer not null,
  ivl integer not null, factor integer not null, reps integer not null,
  lapses integer not null, left integer not null, odue integer not null,
  odid integer not null, flags integer not null, data text not null
);
CREATE TABLE graves (usn integer not null, oid integer not null, type integer not null);
CREATE TABLE revlog (
  id integer primary key, cid integer not null, usn integer not null,
  ease integer not null, ivl integer not null, lastIvl integer not null,
  factor integer not null, time integer not null, type integer not null
);
CREATE INDEX ix_notes_usn ON notes (usn);
CREATE INDEX ix_cards_usn ON cards (usn);
CREATE INDEX ix_cards_nid ON cards (nid);
CREATE INDEX ix_cards_sched ON cards (did, queue, due);
CREATE INDEX ix_revlog_cid ON revlog (cid);
CREATE INDEX ix_revlog_usn ON revlog (usn);
CREATE INDEX ix_notes_csum ON notes (csum);
`

export const DECK_NAME = 'Novel Translator'
export const MODEL_NAME = 'Novel Translator — слово'

/** Поля заметки. Порядок важен: он же порядок колонок в flds */
export const FIELD_NAMES = ['Слово', 'Перевод', 'Контекст', 'Пояснение'] as const

const CARD_CSS = `.card {
  font-family: Georgia, serif;
  font-size: 20px;
  text-align: center;
  color: #1a1a1a;
  background-color: #fdfdfd;
}
.context { font-size: 16px; color: #666; font-style: italic; margin-top: 12px; }
.note { font-size: 15px; color: #666; margin-top: 12px; }`

const FRONT_TEMPLATE = `{{Слово}}
<div class="context">{{Контекст}}</div>`

const BACK_TEMPLATE = `{{FrontSide}}
<hr id="answer">
{{Перевод}}
<div class="note">{{Пояснение}}</div>`

export function buildModel(modelId: number, deckId: number, now: number): Record<string, unknown> {
  return {
    id: modelId,
    name: MODEL_NAME,
    type: 0,
    mod: now,
    usn: -1,
    sortf: 0,
    did: deckId,
    tmpls: [
      {
        name: 'Слово → перевод',
        ord: 0,
        qfmt: FRONT_TEMPLATE,
        afmt: BACK_TEMPLATE,
        did: null,
        bqfmt: '',
        bafmt: '',
      },
    ],
    flds: FIELD_NAMES.map((name, ord) => ({
      name,
      ord,
      sticky: false,
      rtl: false,
      font: 'Arial',
      size: 20,
      media: [],
    })),
    css: CARD_CSS,
    latexPre: '\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n\\pagestyle{empty}\n\\begin{document}\n',
    latexPost: '\\end{document}',
    // карточка создаётся, если непусто первое поле
    req: [[0, 'any', [0]]],
    vers: [],
    tags: [],
  }
}

export function buildDeck(deckId: number, now: number, name = DECK_NAME): Record<string, unknown> {
  return {
    id: deckId,
    name,
    mod: now,
    usn: -1,
    lrnToday: [0, 0],
    revToday: [0, 0],
    newToday: [0, 0],
    timeToday: [0, 0],
    collapsed: false,
    browserCollapsed: true,
    desc: 'Слова, сохранённые расширением Novel Translator',
    dyn: 0,
    conf: 1,
    extendNew: 0,
    extendRev: 0,
  }
}

export const DEFAULT_DECK_CONF = {
  '1': {
    id: 1,
    name: 'Default',
    mod: 0,
    usn: 0,
    maxTaken: 60,
    autoplay: true,
    timer: 0,
    replayq: true,
    new: { bury: true, delays: [1, 10], initialFactor: 2500, ints: [1, 4, 7], order: 1, perDay: 20 },
    rev: { bury: true, ease4: 1.3, fuzz: 0.05, ivlFct: 1, maxIvl: 36500, minSpace: 1, perDay: 200 },
    lapse: { delays: [10], leechAction: 0, leechFails: 8, minInt: 1, mult: 0 },
    dyn: false,
  },
}

export const DEFAULT_CONF = {
  nextPos: 1,
  estTimes: true,
  activeDecks: [1],
  sortType: 'noteFld',
  timeLim: 0,
  sortBackwards: false,
  addToCur: true,
  curDeck: 1,
  newBury: true,
  newSpread: 0,
  dueCounter: 1,
  curModel: null,
  collapseTime: 1200,
}
