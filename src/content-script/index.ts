import "../assets/base.css"
import "./index.css"
import { name } from "~/package.json"
import { createApp, defineComponent, h } from "vue"
import PrimeVue from "primevue/config"
import Aura from '@primeuix/themes/aura'
import ChapterOverlay from "@/content-script/overlay/ChapterOverlay.vue"
import { useAccessSites } from "@/composables/useAccessSites"

// helpers
function createStartButton(label: string): HTMLButtonElement {
  const el = new DOMParser().parseFromString(
    `<button type="button" class="${name}">${label}</button>`,
    "text/html",
  ).body.firstElementChild
  return el instanceof HTMLButtonElement ? el : document.createElement("button")
}

function createOverlayContainer(): HTMLDivElement {
  const el = document.createElement("div")
  el.id = `novel-translator-overlay-root`

  return el
}

let app: ReturnType<typeof createApp> | null = null
let container: HTMLDivElement | null = null

function mountOverlay(): void {
  if (container) return
  container = createOverlayContainer()
  document.body?.append(container)
  const Root = defineComponent({
    setup() {
      const handleClose = (): void => {
        unmountOverlay()
      }
      return () => h(ChapterOverlay, { onClose: handleClose })
    },
  })

  app = createApp(Root)
  app.use(PrimeVue, {
    theme: {
      preset: Aura
    }
  })
  app.mount(container)
}

function unmountOverlay(): void {
  if (app && container) {
    app.unmount()
    container.remove()
  }
  app = null
  container = null
}

const { isCurrentSiteAllowed, promise } = useAccessSites()

promise.then(() => {
  if (isCurrentSiteAllowed()) {
    const btn = createStartButton("Начать работу")
    if (document.body) {
      // document.body.append(btn)
      // btn.addEventListener("click", (): void => {
      //   mountOverlay()
      //   btn.style.display = "none"
      // })
      mountOverlay()
    }
  } else {
    console.info("Novel Translator: текущий сайт не в списке разрешенных")
  }
})

self.onerror = function (message, source, lineno, colno, error) {
  console.info("Error: " + message)
  console.info("Source: " + source)
  console.info("Line: " + lineno)
  console.info("Column: " + colno)
  console.info("Error object: " + error)
}

console.info("hello world from content-script")
