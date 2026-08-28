import { defineManifest } from "@crxjs/vite-plugin"
import ManifestConfig from "./manifest.config"

// @ts-expect-error ManifestConfig provides all required fields
export default defineManifest((env) => ({
  ...ManifestConfig,
  key: env["CHROME_ADDON_KEY"],
  // список слов при чтении живёт в боковой панели браузера, а не в доке на странице
  side_panel: {
    default_path: "src/ui/side-panel/index.html",
  },
  permissions: [...ManifestConfig.permissions, "sidePanel"],
  // Панель не открывается сама — только жестом пользователя. Горячая клавиша считается
  // жестом, и это единственный способ открыть её, не целясь мышью. Строка описания
  // видна в chrome://extensions/shortcuts; локалей манифеста в проекте нет.
  commands: {
    "open-panel": {
      suggested_key: { default: "Ctrl+Shift+E", mac: "Command+Shift+E" },
      description: "Open the Erudit side panel",
    },
  },
}))
