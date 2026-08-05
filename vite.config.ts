import fs from "node:fs"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import vueDevTools from "vite-plugin-vue-devtools"
import VueRouter from "unplugin-vue-router/vite"
import TurboConsole from "unplugin-turbo-console/vite"
import tailwindcss from "@tailwindcss/vite"
import AutoImport from "unplugin-auto-import/vite"
import Components from "unplugin-vue-components/vite"
import { PrimeVueResolver } from "@primevue/auto-import-resolver"
import "dotenv/config"

// @ts-expect-error commonjs module
import { define, raw } from "./define.config.mjs"
import { dirname, relative, resolve } from "node:path"

const IS_DEV = process.env.NODE_ENV === "development"
const PORT = Number(process.env.PORT) || 3303

const getImmediateDirectories = (path: string) =>
  fs
    .readdirSync(path, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)

export default defineConfig({
  base: IS_DEV ? `/` : "",

  build: {
    watch: IS_DEV ? {} : undefined,
    sourcemap: IS_DEV ? "inline" : false,
    rollupOptions: {
      input: {
        setup: resolve(__dirname, "src/ui/setup/index.html"),
      },
    },
    terserOptions: {
      mangle: false,
    },
  },

  define,

  // legacy: {
  //   // ⚠️ SECURITY RISK: Allows WebSockets to connect to the vite server without a token check ⚠️
  //   // See https://github.com/crxjs/chrome-extension-tools/issues/971 for more info
  //   // The linked issue gives a potential fix that @crxjs/vite-plugin could implement
  //   skipWebSocketTokenCheck: true,
  // },

  optimizeDeps: {
    include: ["vue", "@vueuse/core", "webextension-polyfill"],
    exclude: ["vue-demi"],
  },

  plugins: [
    {
      name: "ensure-output-dir",
      buildStart() {
        ;["dist/chrome", "dist/firefox"].forEach((dir) => {
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        })
      },
    },

    vueDevTools(),

    VueRouter({
      dts: "src/types/typed-router.d.ts",
      routesFolder: getImmediateDirectories("src/ui").map((dir) => ({
        src: `src/ui/${dir}/pages`,
        path: `${dir}/`,
      })),
    }),

    vue(),

    tailwindcss(),

    AutoImport({
      imports: [
        "vue",
        "vue-router",
        "pinia",
        "@vueuse/core",
        { "vue-router/auto": ["definePage"] },
        {
          "webextension-polyfill": [["=", "browser"]],
        },
      ],
      dts: "src/types/auto-imports.d.ts",
      dirs: ["src/composables/**", "src/stores/**", "src/utils/**"],
      vueTemplate: true,
      viteOptimizeDeps: true,
      eslintrc: {
        enabled: true,
        filepath: "src/types/.eslintrc-auto-import.json",
      },
    }),

    Components({
      dirs: ["src/components"],
      dts: "src/types/components.d.ts",
      directoryAsNamespace: true,
      globalNamespaces: ["state"],
      resolvers: [PrimeVueResolver()],
    }),

    TurboConsole(),

    {
      name: "html-define-plugin",
      enforce: "post",
      transformIndexHtml(html) {
        return html.replace(
          /%+\s*(\w+)\s*%+/g,
          (_, key) => raw[key] ?? `%${key}%`,
        )
      },
    },

    // rewrite assets to use relative path
    {
      name: "assets-rewrite",
      enforce: "post",
      apply: "build",
      transformIndexHtml(html, { path }) {
        return html.replace(
          /"\/assets\//g,
          `"${relative(dirname(path), "/assets")}/`,
        )
      },
    },
  ],

  resolve: {
    alias: {
      "~": fileURLToPath(new URL(".", import.meta.url)),
      "@": fileURLToPath(new URL("src", import.meta.url)),
      src: fileURLToPath(new URL("src", import.meta.url)),
      "@assets": fileURLToPath(new URL("src/assets", import.meta.url)),
    },
  },

  // server: {
  //   port: PORT,
  //   hmr: {
  //     host: "localhost",
  //     overlay: false,
  //   },
  //   origin: `http://localhost:${PORT}`,
  //   cors: {
  //     origin: [
  //       // ⚠️ SECURITY RISK: Allows any chrome-extension to access the vite server ⚠️
  //       // See https://github.com/crxjs/chrome-extension-tools/issues/971 for more info
  //       // I don't believe that the linked issue mentions a potential solution
  //       "chrome-extension://",
  //     ],
  //   },
  // },
})
