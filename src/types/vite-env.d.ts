/// <reference types="vite/client" />
/// <reference types="unplugin-vue-router/client" />

// Put your variables here:

declare const __VERSION__: string
declare const __NAME__: string
declare const __DISPLAY_NAME__: string
declare const __CHANGELOG__: string
declare const __GIT_COMMIT__: string
declare const __GITHUB_URL__: string

// Дефолты для dev-сборки из .env, в прод-сборку не попадают
declare const __YANDEX_API_KEY__: string
declare const __YANDEX_FOLDER_ID__: string

// Общий ключ Яндекс.Словаря: бесплатный, попадает и в прод-сборку
declare const __YANDEX_DICT_KEY__: string

// Chrome рисует список слов в боковой панели браузера, Firefox докует его в страницу
declare const __HAS_SIDE_PANEL__: boolean
