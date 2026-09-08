<script setup lang="ts">
import { computed, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, RotateCcw, RotateCw, Settings } from 'lucide-vue-next'
import Button from 'primevue/button'
import InlineSvg from '@/components/InlineSvg.vue'
import emptyPanel from '@/assets/illustrations/empty-panel.svg?raw'
import welcomeArt from '@/assets/illustrations/welcome.svg?raw'
import { useAccessSites } from '@/composables/useAccessSites'
import { FAQ_URL, openOptionsTab } from '@/utils/dictionaryTab'

/**
 * Пустая панель без выхода — тупик: отсюда сайт разрешается, страница
 * перезагружается и открываются настройки, чтобы не идти за этим в значок
 * расширения.
 */
const props = defineProps<{
  /** Пусто, если вкладка не на http-странице: разрешать там нечего */
  currentUrl: string
  /** Вкладка — страница самого расширения: тут не «не работает», а нечего разбирать */
  isOwnPage: boolean
  /** Есть вкладка, которую можно перезагрузить */
  canReload: boolean
}>()

const emit = defineEmits<{ (e: 'reload'): void }>()

const { t } = useI18n()
const { isDenyMode, addSite, removeMatching, isUrlAllowed, isSiteListed } = useAccessSites()

const faqUrl = browser.runtime.getURL(FAQ_URL)

/**
 * Пустая панель значит одно из двух: расширение здесь не работает — тогда это
 * чинится отсюда, или работает, но страница загрузилась раньше разрешения — тогда
 * достаточно перезагрузки. Чинится по-разному: в белом режиме сайт добавляют
 * в список, в чёрном — убирают из него.
 */
const canAllow = computed<boolean>(
  () => Boolean(props.currentUrl) && !isUrlAllowed(props.currentUrl),
)
/** В чёрном режиме вернуть сайт можно, только если он попал туда записью, а не правилом */
const canUnblock = computed<boolean>(
  () => isDenyMode.value && Boolean(props.currentUrl) && isSiteListed(props.currentUrl),
)
/**
 * Причина молчания: служебная страница браузера, свой запрет, встроенное правило
 * или короткий белый список. Без адреса правило про банки и почту ни при чём
 */
const reasonKey = computed<string>(() => {
  if (!props.currentUrl) return 'overlay.panelBrowserPage'
  if (!isDenyMode.value) return 'overlay.panelUnavailableHint'

  return canUnblock.value ? 'popup.currentBlocked' : 'popup.currentGuarded'
})
const currentHost = computed<string>(() => (props.currentUrl ? new URL(props.currentUrl).host : ''))

/**
 * Домен целиком: путь текущей главы в списке разрешённых сайтов только мешал бы.
 * Перезагружаем сами — content script читает список при загрузке документа, и без
 * этого шага панель осталась бы пустой. `nextTick` ждёт записи в storage: она уходит
 * из watcher'а с `flush: 'post'`.
 */
async function allowCurrent(): Promise<void> {
  if (!props.currentUrl) return

  if (canUnblock.value) removeMatching(props.currentUrl)
  else addSite(new URL(props.currentUrl).origin)

  await nextTick()
  emit('reload')
}
</script>

<template>
  <div class="flex h-dvh flex-col items-center justify-center gap-6 p-6 text-center">
    <!-- на своей странице расширение не «не работает» — тут просто нет текста,
         и кнопки «разрешить» и «настройки» вели бы туда, где читатель уже стоит -->
    <InlineSvg
      :markup="isOwnPage ? welcomeArt : emptyPanel"
      class="w-40 text-content"
    />

    <div class="flex flex-col gap-1.5">
      <p class="m-0 font-semibold">
        {{ t(isOwnPage ? 'overlay.panelOwnPage' : 'overlay.panelUnavailable') }}
      </p>
      <p class="m-0 text-sm text-muted">
        {{ t(isOwnPage ? 'overlay.panelOwnPageHint' : reasonKey) }}
      </p>
    </div>

    <div
      v-if="!isOwnPage"
      class="flex w-full max-w-72 flex-col gap-2"
    >
      <!--
        Домен в подписи длинный, а панель узкая: у PrimeVue подпись растянута на всю
        кнопку (`flex: 1 1 auto`), и на переносе иконка отъезжает от неё к самому краю.
        `grow-0` держит их вместе по центру.
      -->
      <Button
        v-if="canUnblock"
        class="w-full [&_.p-button-label]:grow-0"
        :label="t('popup.unblockCurrent', { host: currentHost })"
        @click="allowCurrent"
      >
        <template #icon>
          <RotateCcw :size="16" />
        </template>
      </Button>

      <Button
        v-else-if="canAllow && !isDenyMode"
        class="w-full [&_.p-button-label]:grow-0"
        :label="t('popup.addCurrent', { host: currentHost })"
        @click="allowCurrent"
      >
        <template #icon>
          <Plus :size="16" />
        </template>
      </Button>

      <Button
        v-else-if="canReload && currentUrl"
        class="w-full"
        severity="secondary"
        outlined
        :label="t('overlay.panelReload')"
        @click="emit('reload')"
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
