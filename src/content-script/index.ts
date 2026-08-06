import overlayCss from "./overlay.css?inline"
import { createApp, defineComponent, h, watchEffect } from "vue"
import PrimeVue from "primevue/config"
import Aura from "@primeuix/themes/aura"
import ChapterOverlay from "@/content-script/overlay/ChapterOverlay.vue"
import { useAccessSites } from "@/composables/useAccessSites"
import { useDictionary } from "@/composables/useDictionary"
import { useTheme } from "@/composables/useTheme"
import { mirrorPrimeVueStyles } from "@/content-script/mirrorStyles"
import { i18n } from "@/utils/i18n"
import { OVERLAY_ROOT_ID } from "@/utils/overlayRoot"

let app: ReturnType<typeof createApp> | null = null
let host: HTMLDivElement | null = null
let stopMirror: (() => void) | null = null

/**
 * Оверлей живёт в Shadow DOM: иначе Tailwind-preflight и стили PrimeVue
 * приезжают в документ сайта и ломают его вёрстку (и наоборот).
 */
function createHost(): { host: HTMLDivElement; mount: HTMLDivElement; root: ShadowRoot } {
  const el = document.createElement("div")
  el.id = OVERLAY_ROOT_ID

  const root = el.attachShadow({ mode: "open" })

  const style = document.createElement("style")
  style.textContent = overlayCss
  root.append(style)

  const mount = document.createElement("div")
  mount.className = "nt-overlay"
  root.append(mount)

  return { host: el, mount, root }
}

function mountOverlay(): void {
  if (host) return

  const created = createHost()
  host = created.host
  document.body?.append(host)
  stopMirror = mirrorPrimeVueStyles(created.root)

  const Root = defineComponent({
    setup() {
      // класс кладём внутрь shadow root, а не на <html> сайта: PrimeVue зеркалит светлые
      // токены на :host, и снаружи, наследованием, их уже не перебить
      const { isDark } = useTheme()
      watchEffect(() => created.mount.classList.toggle("dark", isDark.value))

      return () => h(ChapterOverlay, { onClose: unmountOverlay })
    },
  })

  app = createApp(Root)
  app.use(i18n)
  app.use(PrimeVue, {
    theme: {
      preset: Aura,
      options: { darkModeSelector: ".dark" },
    },
  })
  app.mount(created.mount)
}

function unmountOverlay(): void {
  app?.unmount()
  stopMirror?.()
  host?.remove()
  app = null
  host = null
  stopMirror = null
}

const { isCurrentSiteAllowed, promise: sitesLoaded } = useAccessSites()
// словарь ждём тоже: оверлей сразу решает, что из найденного уже сохранено,
// и с пустым словарём пометил бы всё как новое
const { promise: dictionaryLoaded } = useDictionary()

Promise.all([sitesLoaded, dictionaryLoaded]).then(() => {
  if (!isCurrentSiteAllowed()) {
    console.info("Novel Translator: текущий сайт не в списке разрешённых")
    return
  }

  mountOverlay()
})
