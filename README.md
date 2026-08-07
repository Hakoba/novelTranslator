<div align="center">

<img src="public/logo.png" width="88" height="88" alt="">

# Erudit

**Stay in the original. See only the words that are actually above your level.**

[![License](https://img.shields.io/badge/license-GPL--3.0--or--later-blue)](LICENSE)
[![Manifest](https://img.shields.io/badge/manifest-v3-informational)](manifest.config.ts)
[![Browsers](https://img.shields.io/badge/chrome%20%7C%20firefox-supported-success)](#install)
[![Interface](https://img.shields.io/badge/ui-6%20languages-blueviolet)](src/locales)

**English** · [Русский](README.ru.md)

</div>

Erudit is a browser extension (Manifest V3, Chrome and Firefox) that reads the page you are on,
picks out the words and phrases above your CEFR level, translates them, highlights them in place
and files them into a dictionary with spaced repetition and Anki export.

Any page with text will do — an article, a Reddit thread, a web novel — and only on the sites
you explicitly allow.

> **Status: 0.0.1.** Not in the extension stores yet, so it is installed from source.
> Everything described below works; what is missing is listed under [Roadmap](#roadmap).

<!-- Скриншоты. Как появятся файлы, заменить блок ниже на:
<p align="center">
  <img src="landing/img/overlay.png" alt="Слова выше уровня читателя, подсвеченные на странице" width="820">
</p>
Требования к кадрам — landing/img/README.md
-->

<div align="center">
<i>Screenshots are being prepared — see <a href="landing/img/README.md">landing/img/README.md</a> for the shot list.</i>
</div>

## Why another one

A page translator replaces the original, so you stop reading the language you are learning.
A click-to-translate dictionary translates whatever you click, including the hundred words you
already know. Erudit does neither: it leaves the original alone and touches only what is above
the level you set.

That level is yours, not a constant baked into the code. Set it to B1 and B2 words light up;
set it to C1 and the page goes almost quiet.

## What it does

- **CEFR level as the filter.** You say what you read at; everything below that stays untouched.
- **Works before you configure anything.** Out of the box the words are picked by an offline
  CEFR profile (8833 English entries) and translated by a dictionary. No key, no account,
  no payment. A language model is an upgrade, not a prerequisite.
- **Your model, your keys.** OpenAI-compatible APIs, Anthropic Messages and Google Gemini,
  including a model running on your own machine through LM Studio, Ollama or llama.cpp.
  Nothing is sent to a server of ours, because there is no server of ours.
- **Highlighting in the text itself.** Yellow for new words, green for the ones already saved.
  Hovering shows a card with the level, the translation, the transcription and a definition;
  clicking scrolls the page to the next occurrence.
- **A dictionary that leads somewhere.** Saved words go into spaced repetition (1, 3, 7, 16, 35
  and 90 days) and export to Anki as a proper `.apkg` deck — import back works too.
- **Only where you allow it.** The content script mounts on the sites in your list and nowhere
  else. `reddit.com` is there by default; add or remove from the popup in one click.
- **Six interface languages** — English, Russian, Spanish, Portuguese, Chinese, Korean — chosen
  independently of the language you are reading.

## Install

The extension is not in the Chrome Web Store or on AMO yet, so it is built from source.
Node.js 20 or newer is required.

```bash
git clone https://github.com/Hakoba/erudit
cd erudit
npm install
npm run build
```

**Chrome:** open `chrome://extensions`, turn on Developer mode, press *Load unpacked* and
pick `dist/chrome`.

**Firefox:** open `about:debugging#/runtime/this-firefox`, press *Load Temporary Add-on*
and pick any file inside `dist/firefox`. Firefox drops temporary add-ons when it restarts.

After installing, a setup page opens: pick your level and language pair, check the list of
sites, and open any allowed page.

## Configuration

Everything lives in the extension options, split into four sections. Nothing is hardcoded and
no key ever leaves your browser.

### Who finds the words

| | Offline CEFR profile | Language model |
| --- | --- | --- |
| Setup | none, works immediately | model address, plus a key in the cloud |
| Cost | free | your provider's rates, or free locally |
| Finds | single English words | words and phrases, in context, with explanations |
| Languages | English only | any |

The profile is the default. Switch to a model in **Reading → Who finds the hard words**.

### Model

| Preset | Address | Model | Key |
| --- | --- | --- | --- |
| Local | `http://localhost:1234` | `gpt-oss` | not needed |
| Yandex AI Studio | `https://llm.api.cloud.yandex.net` | `gpt://<folder>/yandexgpt-lite/latest` | service account key |
| OpenAI, OpenRouter, Groq, DeepSeek, Mistral | preset buttons | preset buttons | provider key |
| Anthropic, Google Gemini | own request format, pick the API kind | | provider key |

There is a *Check connection* button that sends one short request and reports the response
time or the exact error the overlay would have shown.

### Dictionaries and translators

Single words are translated by a dictionary rather than a model — it is faster and costs
nothing. [Yandex Dictionary](https://yandex.ru/dev/dictionary/) needs a free key;
[dictionaryapi.dev](https://dictionaryapi.dev/) gives definitions without one. Phrases can go
through DeepL or LibreTranslate before the model is involved.

## How it works

1. The content script mounts only on an allowed address and renders its overlay inside a
   Shadow DOM, so the site's own layout is never touched.
2. The readable text is located by one of three sources, in order of confidence: an area you
   picked by hand, a built-in rule for the site (Reddit, WebNovel, RoyalRoad and others), or a
   text-density score that penalises link-heavy blocks and so skips menus and "read also".
3. That text goes either to the offline profile or to your model. The reply is parsed, words
   below your level are dropped, and the rest are highlighted in place.
4. Saved words live in `storage.local`, settings in `storage.sync`. Requests leave through the
   background worker — a content script on an HTTPS page cannot reach a local model over HTTP.

More detail in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md); the current state of every feature
is in [docs/projectInfo.md](docs/projectInfo.md).

## Development

```bash
npm install
cp .env.example .env   # optional keys for the dev build
npm run dev            # watch builds for both browsers
npm run dev:chrome     # Chrome only
npm run dev:firefox    # Firefox only
npm run build          # production build → dist/chrome, dist/firefox
npm run typecheck      # vue-tsc --noEmit
npm run lint           # eslint --fix
npm test               # node:test through tsx
npm run launch         # launch a browser with the extension loaded
```

Vue 3 with `<script setup>`, TypeScript, Vite, Pinia, PrimeVue and Tailwind 4.
Conventions are in [.junie/guidelines.md](.junie/guidelines.md); simplifications that were made
deliberately, with the condition for revisiting each, are in [deferred.md](deferred.md).

Logic with branches lives in modules free of browser APIs and is covered by tests next to the
code — `llmParse.ts` and `matchesSite.ts` are the models to follow.

## Roadmap

- Publishing to the Chrome Web Store and AMO
- CEFR profiles for languages other than English ([docs/cefr-profiles.md](docs/cefr-profiles.md))
- Dictionary sync between devices
- Support for the newer Anki deck format (`collection.anki21b`)

## Contributing

Pull requests are welcome, and the cheapest useful one is a rule for a site the extractor gets
wrong: it is a host and a list of selectors in
[`src/utils/extract/rules.ts`](src/utils/extract/rules.ts), plus a line in the test next to it.
That single entry then works for everyone.

Issues and questions: [GitHub issues](https://github.com/Hakoba/erudit/issues)
or <amion980@gmail.com>.

## Credits

The built-in CEFR word list (`src/utils/cefr/wordLevels.data.ts`, assembled by
`scripts/buildCefrList.mjs`) is built from open profiles:

- **CEFR-J Vocabulary Profile 1.5** (A1–B2) © Yukio Tono, Tokyo University of Foreign Studies —
  free for research and commercial use with attribution,
  <http://www.cefr-j.org/download.html>
- **Octanove Vocabulary Profile C1/C2 1.0** © Octanove Labs —
  [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/),
  <https://github.com/openlanguageprofiles/olp-en-cefrj>

Dictionary data comes from the [Yandex Dictionary API](https://yandex.ru/dev/dictionary/)
and [dictionaryapi.dev](https://dictionaryapi.dev/).

Built on the [vite-vue3-browser-extension-v3](https://github.com/mubaidr/vite-vue3-browser-extension-v3)
template.

## License

[GPL-3.0-or-later](LICENSE). Fork and use it freely; if you distribute your own version, its
source has to stay open under the same licence.
