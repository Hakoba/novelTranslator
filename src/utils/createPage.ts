import { createApp, type App as VueApp, type Component } from "vue"
import PrimeVue from "primevue/config"
import Aura from "@primeuix/themes/aura"
import { pinia } from "@/utils/pinia"
import { appRouter } from "@/utils/router"
import { applyTheme } from "@/composables/useTheme"

/** Общий bootstrap для страниц расширения (popup, options, setup) */
export function createPage(root: Component, defaultRoute: string): VueApp {
  appRouter.addRoute({ path: "/", redirect: defaultRoute })

  const app = createApp(root)
    .use(PrimeVue, {
      theme: {
        preset: Aura,
        options: { darkModeSelector: ".dark" },
      },
    })
    .use(pinia)
    .use(appRouter)

  applyTheme()
  app.mount("#app")

  return app
}
