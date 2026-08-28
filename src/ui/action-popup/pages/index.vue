<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Ban,
  BookMarked,
  Check,
  PanelRight,
  Plus,
  RotateCcw,
  Settings,
  ShieldCheck,
} from 'lucide-vue-next'
import AccessSites from '@/components/accessSites.vue'
import { useAccessSites } from '@/composables/useAccessSites'
import { isValidUrl } from '@/composables/matchesSite'
import { useDictionary } from '@/composables/useDictionary'
import { openDictionaryTab } from '@/utils/dictionaryTab'

const { t } = useI18n()
const { enabledSites, isDenyMode, addSite, removeMatching, isUrlAllowed, isSiteListed } =
  useAccessSites()
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

  if (isDenyMode.value) {
    return count ? t('popup.activeExcept', { count }, count) : t('popup.activeEverywhere')
  }

  return count ? t('popup.active', { count }, count) : t('popup.inactive')
})

const currentHost = computed<string>(() => (currentUrl.value ? new URL(currentUrl.value).host : ''))
/** Работает ли расширение здесь: в чёрном режиме молчат ещё и чувствительные адреса */
const currentAllowed = computed<boolean>(
  () => Boolean(currentUrl.value) && isUrlAllowed(currentUrl.value),
)
/** Запись в списке накрывает адрес — значит в чёрном режиме его можно вернуть */
const currentListed = computed<boolean>(
  () => Boolean(currentUrl.value) && isSiteListed(currentUrl.value),
)

// методы
function openOptions(): void {
  browser.runtime.openOptionsPage()
}


/** Домен целиком: путь текущей главы в списке сайтов только мешал бы */
function listCurrent(): void {
  if (currentUrl.value) addSite(new URL(currentUrl.value).origin)
}

/** Убираем все записи, накрывающие адрес: одной кнопкой сайт должен возвращаться целиком */
function unlistCurrent(): void {
  if (currentUrl.value) removeMatching(currentUrl.value)
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

    <!--
      Кнопка всегда предлагает обратное текущему состоянию: в белом режиме сайт
      добавляют, чтобы включить, в чёрном — чтобы выключить, и убирают из списка,
      чтобы вернуть.
    -->
    <Button
      v-if="currentHost && isDenyMode && currentListed"
      severity="secondary"
      outlined
      size="small"
      :label="t('popup.unblockCurrent', { host: currentHost })"
      @click="unlistCurrent"
    >
      <template #icon>
        <RotateCcw :size="16" />
      </template>
    </Button>
    <Button
      v-else-if="currentHost && isDenyMode && currentAllowed"
      severity="secondary"
      outlined
      size="small"
      :label="t('popup.blockCurrent', { host: currentHost })"
      :title="t('popup.blockCurrentHint')"
      @click="listCurrent"
    >
      <template #icon>
        <Ban :size="16" />
      </template>
    </Button>
    <Button
      v-else-if="currentHost && !isDenyMode && !currentAllowed"
      severity="secondary"
      outlined
      size="small"
      :label="t('popup.addCurrent', { host: currentHost })"
      :title="t('popup.addCurrentHint')"
      @click="listCurrent"
    >
      <template #icon>
        <Plus :size="16" />
      </template>
    </Button>
    <!-- в чёрном режиме сюда попадают адреса, которые бережёт встроенное правило -->
    <p
      v-else-if="currentHost && isDenyMode"
      class="m-0 flex items-center gap-2 text-muted"
    >
      <ShieldCheck :size="16" />
      {{ t('popup.currentGuarded') }}
    </p>
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
