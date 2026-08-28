import { createApp, type App as VueApp, type Component } from "vue"
import PrimeVue from "primevue/config"
import { eruditTheme } from "@/utils/theme"
import { pinia } from "@/utils/pinia"
import { appRouter } from "@/utils/router"
import { i18n } from "@/utils/i18n"
import { applyTheme } from "@/composables/useTheme"

/** Общий bootstrap для страниц расширения (popup, options, setup) */
export function createPage(root: Component, defaultRoute: string): VueApp {
  // ?route= позволяет открыть конкретный раздел ссылкой: history-роутер стартует
  // с пути index.html, попадает в catchAll и приходит сюда ещё с исходным search
  appRouter.addRoute({
    path: "/",
    redirect: () =>
      new URLSearchParams(location.search).get("route") || defaultRoute,
  })

  const app = createApp(root)
    .use(PrimeVue, {
      theme: {
        preset: eruditTheme,
        options: { darkModeSelector: ".dark" },
      },
    })
    .use(pinia)
    .use(appRouter)
    .use(i18n)

  applyTheme()
  app.mount("#app")

  return app
}
