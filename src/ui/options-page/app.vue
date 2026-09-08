<script setup lang="ts">
import { computed } from 'vue'
import { BookMarked, BookOpenText, Bot, CircleQuestionMark, DatabaseBackup, Dumbbell, Github, Globe, Library, Replace, Settings } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import AppLogo from '@/components/AppLogo.vue'
import ThemeSwitch from '@/components/ThemeSwitch.vue'
import { useLlmSettings } from '@/composables/useLlmSettings'
import { needsApiKey } from '@/utils/settingsStatus'

const { t } = useI18n()
const { settings } = useLlmSettings()

const githubUrl = __GITHUB_URL__
const version = __VERSION__

const LINK_CLASS =
  'flex items-center gap-2 rounded-md px-3 py-2 text-content no-underline hover:bg-surface-hover'
const ACTIVE_LINK_CLASS = 'bg-surface-hover font-semibold'
const SUB_LINK_CLASS = `${LINK_CLASS} pl-9 text-sm`

// computed
const modelNeedsKey = computed<boolean>(() =>
  needsApiKey(settings.value.baseUrl, settings.value.apiKey),
)
</script>

<template>
  <div class="mx-auto flex max-w-6xl flex-col gap-6 p-6">
    <header class="flex items-center justify-between gap-2">
      <h1 class="m-0 flex items-baseline gap-2 text-xl font-semibold">
        <AppLogo
          :size="26"
          class="self-center"
        />
        Erudit
        <!-- версия моноширинным и вполголоса: она нужна в баг-репорте, а не в заголовке -->
        <span class="font-mono text-xs font-normal text-muted">{{ version }}</span>
      </h1>

      <div class="flex items-center gap-1">
        <a
          :href="githubUrl"
          target="_blank"
          rel="noreferrer noopener"
          class="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted no-underline
                 hover:bg-surface-hover hover:text-content"
        >
          <Github :size="16" />
          GitHub
        </a>
        <ThemeSwitch />
      </div>
    </header>

    <div class="flex flex-col gap-6 sm:flex-row">
      <nav
        class="flex w-full shrink-0 flex-col gap-1 sm:w-56"
        :aria-label="t('nav.sections')"
      >
        <p class="m-0 flex items-center gap-2 px-3 py-2 font-semibold text-muted">
          <Settings :size="18" />
          {{ t('nav.settings') }}
        </p>
        <RouterLink
          to="/options-page"
          :class="SUB_LINK_CLASS"
          :exact-active-class="ACTIVE_LINK_CLASS"
        >
          <BookOpenText :size="16" />
          {{ t('nav.reading') }}
        </RouterLink>
        <RouterLink
          to="/options-page/model"
          :class="SUB_LINK_CLASS"
          :exact-active-class="ACTIVE_LINK_CLASS"
        >
          <Bot :size="16" />
          {{ t('nav.model') }}
          <!-- без ключа облачная модель молчит, а узнать об этом иначе можно только при разборе -->
          <span
            v-if="modelNeedsKey"
            class="ml-auto size-2 rounded-full bg-orange-400"
            :title="t('nav.modelNeedsKey')"
          />
        </RouterLink>
        <RouterLink
          to="/options-page/dictionaries"
          :class="SUB_LINK_CLASS"
          :exact-active-class="ACTIVE_LINK_CLASS"
        >
          <Library :size="16" />
          {{ t('nav.dictionaries') }}
        </RouterLink>
        <RouterLink
          to="/options-page/sites"
          :class="SUB_LINK_CLASS"
          :exact-active-class="ACTIVE_LINK_CLASS"
        >
          <Globe :size="16" />
          {{ t('nav.sites') }}
        </RouterLink>

        <RouterLink
          to="/options-page/dictionary"
          :class="`${LINK_CLASS} mt-2`"
          :exact-active-class="ACTIVE_LINK_CLASS"
        >
          <BookMarked :size="18" />
          {{ t('nav.dictionary') }}
        </RouterLink>
        <RouterLink
          to="/options-page/training"
          :class="LINK_CLASS"
          :exact-active-class="ACTIVE_LINK_CLASS"
        >
          <Dumbbell :size="18" />
          {{ t('nav.training') }}
        </RouterLink>
        <RouterLink
          to="/options-page/immersion"
          :class="LINK_CLASS"
          :exact-active-class="ACTIVE_LINK_CLASS"
        >
          <Replace :size="18" />
          {{ t('nav.immersion') }}
        </RouterLink>

        <RouterLink
          to="/options-page/backup"
          :class="LINK_CLASS"
          :exact-active-class="ACTIVE_LINK_CLASS"
        >
          <DatabaseBackup :size="18" />
          {{ t('nav.backup') }}
        </RouterLink>

        <RouterLink
          to="/options-page/faq"
          :class="`${LINK_CLASS} mt-2`"
          :exact-active-class="ACTIVE_LINK_CLASS"
        >
          <CircleQuestionMark :size="18" />
          {{ t('nav.faq') }}
        </RouterLink>
      </nav>

      <main class="flex min-w-0 flex-1 flex-col gap-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>
