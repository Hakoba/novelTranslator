import fs from "node:fs"
import packageJson from "../package.json" with { type: "json" }

// Хук `npm version`: до коммита закрываем раздел «Не выпущено» номером версии и датой,
// сверху остаётся пустой раздел под следующий релиз. Экран после обновления показывает
// верхний непустой раздел CHANGELOG — иначе читатель увидит то, что ещё не вышло.

const UNRELEASED = "## Не выпущено"
const PATH = "CHANGELOG.md"

const text = fs.readFileSync(PATH, "utf-8")
const start = text.indexOf(UNRELEASED)

if (start === -1) {
  console.error(`${ PATH }: нет раздела «${ UNRELEASED }»`)
  process.exit(1)
}

const body = text.slice(start + UNRELEASED.length).split("\n## ")[0]

if (!body.includes("\n- ")) {
  console.error(`${ PATH }: раздел «${ UNRELEASED }» пуст, в релиз нечего класть`)
  process.exit(1)
}

const title = `${ packageJson.version } — ${ new Date().toISOString().slice(0, 10) }`

fs.writeFileSync(PATH, text.replace(UNRELEASED, `${ UNRELEASED }\n\n## ${ title }`))
console.info(`${ PATH }: раздел закрыт как ${ title }`)
