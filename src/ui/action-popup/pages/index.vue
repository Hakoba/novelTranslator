<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { BookMarked, Check, PanelRight, Plus, Settings } from 'lucide-vue-next'
import AccessSites from '@/components/accessSites.vue'
import { useAccessSites } from '@/composables/useAccessSites'
import { isValidUrl, matchesSite } from '@/composables/matchesSite'
import { useDictionary } from '@/composables/useDictionary'
import { openDictionaryTab } from '@/utils/dictionaryTab'

const { t } = useI18n()
const { sites, enabledSites, addSite } = useAccessSites()
const { entries } = useDictionary()

// state
/** Адрес открытой вкладки: из него берём домен для кнопки «разрешить» */
const currentUrl = ref<string>('')
/** Окно узнаём заранее: sidePanel.open требует жеста, и await в обработчике клика его бы съел */
const windowId = ref<number | undefined>(undefined)

/** Сборка с боковой панелью браузера — кнопка открытия есть только там */
const hasSidePanel = __HAS_SIDE_PANEL__

// computed
const summary = computed<string>(() => {
  const count = enabledSites.value.length

  return count ? t('popup.active', { count }, count) : t('popup.inactive')
})

const currentHost = computed<string>(() => (currentUrl.value ? new URL(currentUrl.value).host : ''))
/** Записи бывают шире домена (*.example.com, путь-префикс) — сверяем по тем же правилам, что и content script */
const currentAllowed = computed<boolean>(() =>
  Boolean(currentUrl.value) && sites.value.some((site) => matchesSite(currentUrl.value, site.url)),
)

// методы
function openOptions(): void {
  browser.runtime.openOptionsPage()
}


/** Домен целиком: путь текущей главы в списке разрешённых сайтов только мешал бы */
function allowCurrent(): void {
  if (currentUrl.value) addSite(new URL(currentUrl.value).origin)
}

/** Список слов при чтении живёт в боковой панели браузера — сама она не открывается */
function openSidePanel(): void {
  if (windowId.value === undefined) return

  void chrome.sidePanel.open({ windowId: windowId.value })
  window.close()
}

// хуки
onMounted(async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
  windowId.value = tab?.windowId
  // у страниц chrome:// и about: адрес не отдают либо он не http — кнопку тогда не показываем
  if (tab?.url && isValidUrl(tab.url)) currentUrl.value = tab.url
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between gap-2">
      <span class="text-muted">{{ summary }}</span>
      <Button
        severity="secondary"
        text
        rounded
        :aria-label="t('nav.settings')"
        @click="openOptions"
      >
        <Settings :size="18" />
      </Button>
    </div>

    <!-- главное действие попапа: за словарём приходят чаще, чем правят список сайтов -->
    <Button
      :label="entries.length ? t('popup.dictionary', { count: entries.length }) : t('popup.dictionaryEmpty')"
      @click="openDictionaryTab"
    >
      <template #icon>
        <BookMarked :size="18" />
      </template>
    </Button>

    <Button
      v-if="hasSidePanel"
      severity="secondary"
      outlined
      :label="t('popup.openPanel')"
      @click="openSidePanel"
    >
      <template #icon>
        <PanelRight :size="16" />
      </template>
    </Button>

    <Button
      v-if="currentHost && !currentAllowed"
      severity="secondary"
      outlined
      size="small"
      :label="t('popup.addCurrent', { host: currentHost })"
      :title="t('popup.addCurrentHint')"
      @click="allowCurrent"
    >
      <template #icon>
        <Plus :size="16" />
      </template>
    </Button>
    <p
      v-else-if="currentHost"
      class="m-0 flex items-center gap-2 text-muted"
    >
      <Check :size="16" />
      {{ t('popup.currentAllowed') }}
    </p>

    <AccessSites />
  </div>
</template>
