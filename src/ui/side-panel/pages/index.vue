<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import type { Runtime } from 'webextension-polyfill'
import { useI18n } from 'vue-i18n'
import { Plus, RotateCw, Settings } from 'lucide-vue-next'
import OverlayHeader from '@/components/OverlayHeader.vue'
import WordListPanel from '@/components/WordListPanel.vue'
import { useAccessSites } from '@/composables/useAccessSites'
import { isValidUrl, matchesSite } from '@/composables/matchesSite'
import { useDictionary } from '@/composables/useDictionary'
import { useIgnoredWords } from '@/composables/useIgnoredWords'
import { useReaderSettings } from '@/composables/useReaderSettings'
import { FAQ_URL, openOptionsTab } from '@/utils/dictionaryTab'
import {
  PANEL_PORT,
  panelStateFromMessage,
  requestPanelState,
  sendPanelCommand,
  type PanelCommand,
  type PanelState,
} from '@/utils/panelBus'
import { findSentence } from '@/utils/sentence'
import type { WordWithExplanation } from '@/types/words'

/**
 * Боковая панель рисует состояние разбора активной вкладки. Живёт оно у оверлея
 * в content script: панель спрашивает снимок при открытии и смене вкладки, дальше
 * оверлей сам присылает обновления. Словарь и настройки — напрямую из storage,
 * они реактивны в обоих контекстах без сообщений.
 */
const { t } = useI18n()
const { addEntry } = useDictionary()
const { ignoreWord } = useIgnoredWords()
const { settings: readerSettings } = useReaderSettings()
const { sites, addSite } = useAccessSites()

// state
const state = ref<PanelState | null>(null)
const tabId = ref<number | undefined>(undefined)
/** Адрес открытой вкладки: из него берётся домен для кнопки «разрешить» */
const currentUrl = ref<string>('')

const faqUrl = browser.runtime.getURL(FAQ_URL)

// computed
/**
 * Пустая панель значит одно из двух: сайт не разрешён — тогда его можно добавить
 * прямо отсюда, или он разрешён, но страница загрузилась раньше разрешения —
 * тогда достаточно её перезагрузить. Записи бывают шире домена, поэтому сверяем
 * теми же правилами, что и content script.
 */
const canAllow = computed<boolean>(() =>
  Boolean(currentUrl.value) && !sites.value.some((site) => matchesSite(currentUrl.value, site.url)),
)
const currentHost = computed<string>(() => (currentUrl.value ? new URL(currentUrl.value).host : ''))
/** Панель существует в одном окне: активации вкладок чужих окон — не про неё */
let windowId: number | undefined
let port: Runtime.Port | undefined
let portTabId: number | undefined

// методы
/**
 * Пока панель смотрит на вкладку, держим к ней порт: по живому порту оверлей
 * прячет кнопку открытия панели. Закрыли панель — порт рвётся сам.
 */
function attachToTab(): void {
  if (port && portTabId === tabId.value) return

  port?.disconnect()
  port = undefined
  portTabId = undefined

  if (tabId.value === undefined) return

  const next = browser.tabs.connect(tabId.value, { name: PANEL_PORT })
  // страницу перезагрузили или на вкладке нет content script — соединения больше нет
  next.onDisconnect.addListener(() => {
    if (port !== next) return

    port = undefined
    portTabId = undefined
  })
  port = next
  portTabId = tabId.value
}

async function refresh(): Promise<void> {
  attachToTab()
  state.value = tabId.value === undefined ? null : await requestPanelState(tabId.value)
}

async function connect(): Promise<void> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
  tabId.value = tab?.id
  // у страниц chrome:// и about: адрес либо не отдают, либо он не http — там предлагать нечего
  currentUrl.value = tab?.url && isValidUrl(tab.url) ? tab.url : ''
  await refresh()
}

function reloadTab(): void {
  if (tabId.value !== undefined) void browser.tabs.reload(tabId.value)
}

/**
 * Домен целиком: путь текущей главы в списке разрешённых сайтов только мешал бы.
 * Перезагружаем сами — content script читает список при загрузке документа, и без
 * этого шага панель осталась бы пустой. `nextTick` ждёт записи в storage: она уходит
 * из watcher'а с `flush: 'post'`.
 */
async function allowCurrent(): Promise<void> {
  if (!currentUrl.value) return

  addSite(new URL(currentUrl.value).origin)
  await nextTick()
  reloadTab()
}

function command(panelCommand: PanelCommand): void {
  if (tabId.value !== undefined) sendPanelCommand(tabId.value, panelCommand)
}

function addToDictionary(word: WordWithExplanation): void {
  addEntry({
    original: word.original,
    translate: word.translate,
    context: findSentence(state.value?.sourceText ?? '', word.original),
    explanation: word.explanation,
    level: word.level,
  })
}

/** Пояснения тут не будет: их подтягивает WordItem, а списком слов их никто не раскрывал */
function addAll(): void {
  state.value?.words.forEach(addToDictionary)
}

// хуки
onMounted(async (): Promise<void> => {
  const current = await browser.windows.getCurrent()
  windowId = current.id
  await connect()

  // connect, а не refresh: вместе с состоянием обновляется адрес вкладки — от него
  // зависит кнопка «разрешить сайт» на пустой панели
  browser.tabs.onActivated.addListener((info) => {
    if (info.windowId !== windowId) return

    void connect()
  })

  // обычная загрузка страницы: если сайт не разрешён, оверлей ничего не пришлёт,
  // и без опроса панель осталась бы со снимком предыдущей страницы
  browser.tabs.onUpdated.addListener((updatedTabId, change) => {
    if (updatedTabId !== tabId.value || change.status !== 'complete') return

    void connect()
  })

  // Esc во время выбора области: подсказка на странице обещает отмену, но слушает её
  // страница, а фокус после клика по кнопке остался здесь — без этого Esc молчит
  window.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !state.value?.isPicking) return

    command({ command: 'pickArea' })
  })

  // оверлей шлёт снимки сам: и по ходу разбора, и при переходах внутри SPA
  browser.runtime.onMessage.addListener((message: unknown, sender: Runtime.MessageSender) => {
    const next = panelStateFromMessage(message)
    if (next === undefined || sender.tab?.id !== tabId.value) return

    state.value = next
  })
})
</script>

<template>
  <div
    v-if="state"
    class="flex h-dvh flex-col"
  >
    <header class="border-b border-line px-3 py-2.5">
      <OverlayHeader
        :words-count="state.words.length"
        :is-loading="state.isLoading"
        :is-picking="state.isPicking"
        :has-area="state.hasArea"
        :is-started="state.isStarted"
        :is-immersion="readerSettings.immersion"
        @pick-area="command({ command: 'pickArea' })"
        @reset-area="command({ command: 'resetArea' })"
        @reread="command({ command: 'analyze', full: true })"
        @toggle-immersion="readerSettings.immersion = !readerSettings.immersion"
      />
    </header>

    <WordListPanel
      class="flex-1 overflow-y-auto p-3"
      :is-started="state.isStarted"
      :is-loading="state.isLoading"
      :is-immersion-active="state.isImmersionActive"
      :immersion-words="state.immersionWords"
      :error-message="state.errorMessage"
      :words="state.words"
      :on-page="state.onPage"
      :total-words="state.totalWords"
      :source-text="state.sourceText"
      @analyze="command({ command: 'analyze', full: false })"
      @add="addToDictionary"
      @add-all="addAll"
      @ignore="ignoreWord"
      @reveal="(term) => command({ command: 'reveal', term })"
    />
  </div>

  <!-- пустая панель без выхода — тупик: отсюда сайт разрешается, страница перезагружается
       и открываются настройки, чтобы не идти за этим в значок расширения -->
  <div
    v-else
    class="flex h-dvh flex-col items-center justify-center gap-6 p-6 text-center"
  >
    <!-- страница текста, где горят два слова: янтарное новое и зелёное сохранённое.
         Ровно то, что расширение делает с текстом, — и ровно те же два цвета -->
    <svg
      viewBox="0 0 168 124"
      class="w-40 shrink-0 text-content"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="44"
        y="8"
        width="102"
        height="88"
        rx="12"
        transform="rotate(6 95 52)"
        class="fill-surface-hover stroke-line"
        stroke-width="1.5"
      />
      <g transform="rotate(-4 76 64)">
        <rect
          x="22"
          y="20"
          width="102"
          height="88"
          rx="12"
          class="fill-surface stroke-line"
          stroke-width="1.5"
        />
        <rect
          x="36"
          y="38"
          width="60"
          height="7"
          rx="3.5"
          class="fill-current opacity-20"
        />
        <rect
          x="36"
          y="53"
          width="74"
          height="7"
          rx="3.5"
          class="fill-current opacity-20"
        />
        <rect
          x="36"
          y="68"
          width="26"
          height="7"
          rx="3.5"
          class="fill-mark-new"
        />
        <rect
          x="68"
          y="68"
          width="42"
          height="7"
          rx="3.5"
          class="fill-current opacity-20"
        />
        <rect
          x="36"
          y="83"
          width="32"
          height="7"
          rx="3.5"
          class="fill-mark-saved"
        />
        <rect
          x="74"
          y="83"
          width="22"
          height="7"
          rx="3.5"
          class="fill-current opacity-20"
        />
      </g>
    </svg>

    <div class="flex flex-col gap-1.5">
      <p class="m-0 font-semibold">
        {{ t('overlay.panelUnavailable') }}
      </p>
      <p class="m-0 text-sm text-muted">
        {{ t('overlay.panelUnavailableHint') }}
      </p>
    </div>

    <div class="flex w-full max-w-64 flex-col gap-2">
      <Button
        v-if="canAllow"
        class="w-full"
        :label="t('popup.addCurrent', { host: currentHost })"
        @click="allowCurrent"
      >
        <template #icon>
          <Plus :size="16" />
        </template>
      </Button>

      <Button
        v-else-if="tabId !== undefined"
        class="w-full"
        severity="secondary"
        outlined
        :label="t('overlay.panelReload')"
        @click="reloadTab"
      >
        <template #icon>
          <RotateCw :size="16" />
        </template>
      </Button>

      <Button
        class="w-full"
        severity="secondary"
        text
        :label="t('nav.settings')"
        @click="openOptionsTab"
      >
        <template #icon>
          <Settings :size="16" />
        </template>
      </Button>
    </div>

    <a
      :href="faqUrl"
      target="_blank"
      rel="noreferrer noopener"
      class="text-sm text-muted underline decoration-dotted underline-offset-4 hover:text-content"
    >
      {{ t('nav.faq') }}
    </a>
  </div>
</template>
