import fs from "node:fs"
import { spawnSync } from "node:child_process"
import packageJson from "./package.json" with { type: "json" }

// Read CHANGELOG.md file into a string.
const changelog = fs.readFileSync("./CHANGELOG.md", "utf-8")

// Get the current git commit hash.
const gitCommit = spawnSync("git", ["rev-parse", "--short", "HEAD"])
  .stdout.toString()
  .trim()

// Don't forget to add your added variables to vite-env.d.ts also!

// These variables are available in your Vue components and will be replaced by their values at build time.
// These will be compiled into your app. Don't store secrets here!

// Ключи Яндекса подставляем только в dev-сборку, чтобы не зашить их в артефакт для стора
const isDev = process.env.NODE_ENV === "development"

const raw = {
  YANDEX_API_KEY: isDev ? process.env.YANDEX_API_KEY ?? "" : "",
  YANDEX_FOLDER_ID: isDev ? process.env.YANDEX_FOLDER_ID ?? "" : "",
  // Ключ Яндекс.Словаря, в отличие от ключей модели, идёт и в прод-сборку: он
  // бесплатный, с суточной квотой, и нужен, чтобы перевод работал сразу после
  // установки. Из собранного расширения его несложно достать — это ключ-витрина,
  // а не секрет: свой ключ читатель ставит в настройках и перебивает общий.
  YANDEX_DICT_KEY: process.env.YANDEX_DICT_KEY ?? "",
  VERSION: packageJson.version,
  NAME: packageJson.name,
  DISPLAY_NAME: packageJson.displayName,
  CHANGELOG: changelog,
  GIT_COMMIT: gitCommit,
  GITHUB_URL: packageJson.repository.url,
  // Set the HTML title for all pages from package.json so you can use %HTMLTITLE% in your HTML files.
  HTML_TITLE: packageJson.displayName,
}

const define = Object.fromEntries(
  Object.entries(raw).map(([k, v]) => [`__${ k }__`, JSON.stringify(v)])
)

export { raw, define }
