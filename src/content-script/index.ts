import overlayCss from "./overlay.css?inline"
import { createApp, defineComponent, h, ref, watchEffect } from "vue"
import PrimeVue from "primevue/config"
import Aura from "@primeuix/themes/aura"
import ChapterOverlay from "@/content-script/overlay/ChapterOverlay.vue"
import { useAccessSites } from "@/composables/useAccessSites"
import { useDictionary } from "@/composables/useDictionary"
import { releasePage } from "@/composables/useOverlayDock"
import { publishPanelState } from "@/content-script/panelBridge"
import { useTheme } from "@/composables/useTheme"
import { mirrorPrimeVueStyles } from "@/content-script/mirrorStyles"
import { i18n } from "@/utils/i18n"
import { OVERLAY_ROOT_ID } from "@/utils/overlayRoot"

let app: ReturnType<typeof createApp> | null = null
let host: HTMLDivElement | null = null
let stopMirror: (() => void) | null = null

/** Запрос без query: reddit меняет параметры адреса и без перехода на другую страницу */
function pageAddress(): string {
  return location.origin + location.pathname
}

/**
 * Ключ оверлея: сменился — Vue пересоздаёт компонент, и разбор идёт заново
 * с чистым списком слов вместо остатков прошлой страницы.
 */
const page = ref<string>(pageAddress())

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

      return () => h(ChapterOverlay, { key: page.value, onClose: unmountOverlay })
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
  // отступ ставит сам оверлей, но снять его некому: его watchEffect уже остановлен
  releasePage()
  // боковая панель и счётчик на иконке не должны показывать снятый разбор
  publishPanelState(null)
  app = null
  host = null
  stopMirror = null
}

/**
 * Reddit и другие SPA меняют страницу, не перезагружая документ, — content script
 * при этом не перезапускается, и оверлей остаётся с разбором предыдущей страницы.
 * Своего события у такого перехода нет: Navigation API есть не во всех браузерах,
 * `history.pushState` сайта из изолированного мира не виден, а `webNavigation`
 * в фоне стоит лишнего разрешения — оно и так под вопросом при проверке в сторе.
 * Сравнение адреса раз в полсекунды стоит дешевле всего перечисленного.
 */
const NAVIGATION_POLL_MS = 500

/**
 * Сколько ждать после смены адреса, прежде чем разбирать. Текст SPA подставляет
 * не мгновенно, и разбор сразу после перехода прочитал бы предыдущую страницу.
 * Ждать появления самого текста было бы точнее, но за ним пришлось бы следить
 * MutationObserver'ом — а он на чужой странице стоит дороже одной задержки.
 */
const CONTENT_SETTLE_MS = 700

function watchNavigation(): void {
  let seen = pageAddress()

  setInterval(() => {
    const current = pageAddress()
    if (current === seen) return

    seen = current

    if (!isCurrentSiteAllowed()) {
      unmountOverlay()
      return
    }

    setTimeout(() => {
      // за время ожидания успели уйти дальше — разбирать эту страницу уже незачем
      if (pageAddress() !== seen) return

      // закрытый оверлей возвращается: переход внутри SPA — такая же новая
      // страница, как при обычной загрузке, а там он появляется заново
      page.value = seen
      mountOverlay()
    }, CONTENT_SETTLE_MS)
  }, NAVIGATION_POLL_MS)
}

const { isCurrentSiteAllowed, promise: sitesLoaded } = useAccessSites()
// словарь ждём тоже: оверлей сразу решает, что из найденного уже сохранено,
// и с пустым словарём пометил бы всё как новое
const { promise: dictionaryLoaded } = useDictionary()

Promise.all([sitesLoaded, dictionaryLoaded]).then(() => {
  // следим в любом случае: со списком сайтов, где разрешён только раздел,
  // страница может стать разрешённой уже после загрузки документа
  watchNavigation()

  if (!isCurrentSiteAllowed()) {
    console.info("Erudit: текущий сайт не в списке разрешённых")
    return
  }

  mountOverlay()
})
