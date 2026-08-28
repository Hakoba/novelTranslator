<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { BookOpen, Bot, CircleQuestionMark, ExternalLink, GraduationCap, Languages } from 'lucide-vue-next'
import AccessSites from '@/components/accessSites.vue'
import InlineSvg from '@/components/InlineSvg.vue'
import welcomeArt from '@/assets/illustrations/welcome.svg?raw'
import { DEMO_URL, useAccessSites } from '@/composables/useAccessSites'
import { useReaderSettings } from '@/composables/useReaderSettings'
import { PROFILE_LANG } from '@/utils/analyze'
import { LANGUAGES } from '@/utils/languages'
import { FAQ_URL } from '@/utils/dictionaryTab'
import { CEFR_LEVELS } from '@/types/words'

const { t } = useI18n()
const { settings } = useReaderSettings()
const { isUrlAllowed } = useAccessSites()

const displayName = __DISPLAY_NAME__
const faqUrl = browser.runtime.getURL(FAQ_URL)

// computed
/** Демо-страницу предлагаем, только пока она разрешена: сайт из списка можно убрать,
 * а в режиме «везде, кроме» его туда, наоборот, могли внести */
const demoUrl = computed<string | undefined>(() =>
  isUrlAllowed(DEMO_URL) ? DEMO_URL : undefined,
)

// разбор без модели держится на профиле CEFR, а он собран только по английскому
const needsModel = computed<boolean>(() => settings.value.sourceLang !== PROFILE_LANG)

// методы
function openOptions(): void {
  browser.runtime.openOptionsPage()
}
</script>

<template>
  <Card>
    <template #title>
      {{ t('setup.installed', { name: displayName }) }}
    </template>
    <template #subtitle>
      {{ t('setup.installedSubtitle') }}
    </template>
    <template #content>
      <!-- картинка вместо описания: что расширение делает со страницей, видно быстрее,
           чем читается абзац -->
      <div class="flex justify-center py-2">
        <InlineSvg
          :markup="welcomeArt"
          class="w-56 text-content"
        />
      </div>

      <!-- список, а не набор карточек: шагов три и порядок у них важен -->
      <ol class="m-0 flex list-none flex-col gap-6 p-0 pt-2">
        <li class="flex flex-col gap-3">
          <h2 class="m-0 flex items-center gap-2 text-base font-semibold">
            <GraduationCap :size="18" />
            {{ t('setup.stepLevel') }}
          </h2>
          <p class="m-0 text-muted">
            {{ t('setup.stepLevelHint') }}
          </p>

          <div class="grid gap-3 sm:grid-cols-3">
            <div class="flex flex-col gap-2">
              <label
                for="setup-level"
                class="text-muted"
              >
                {{ t('settings.language.level') }}
              </label>
              <Select
                id="setup-level"
                v-model="settings.level"
                :options="[...CEFR_LEVELS]"
                class="w-full"
              />
            </div>

            <div class="flex flex-col gap-2">
              <label
                for="setup-source"
                class="text-muted"
              >
                {{ t('settings.language.source') }}
              </label>
              <Select
                id="setup-source"
                v-model="settings.sourceLang"
                :options="LANGUAGES"
                option-label="native"
                option-value="code"
                class="w-full"
              />
            </div>

            <div class="flex flex-col gap-2">
              <label
                for="setup-target"
                class="text-muted"
              >
                {{ t('settings.language.target') }}
              </label>
              <Select
                id="setup-target"
                v-model="settings.targetLang"
                :options="LANGUAGES"
                option-label="native"
                option-value="code"
                class="w-full"
              />
            </div>
          </div>
        </li>

        <li class="flex flex-col gap-3 border-t border-line pt-6">
          <h2 class="m-0 flex items-center gap-2 text-base font-semibold">
            <Languages :size="18" />
            {{ t('setup.stepSites') }}
          </h2>
          <p class="m-0 text-muted">
            {{ t('setup.stepSitesHint') }}
          </p>

          <AccessSites />
        </li>

        <li class="flex flex-col gap-3 border-t border-line pt-6">
          <h2 class="m-0 flex items-center gap-2 text-base font-semibold">
            <BookOpen :size="18" />
            {{ t('setup.stepReady') }}
          </h2>
          <p class="m-0 text-muted">
            {{ t(needsModel ? 'setup.stepReadyModel' : 'setup.stepReadyHint') }}
          </p>

          <div class="flex flex-wrap gap-2">
            <a
              v-if="demoUrl && !needsModel"
              :href="demoUrl"
              target="_blank"
              rel="noreferrer noopener"
            >
              <Button :label="t('setup.tryIt')">
                <template #icon>
                  <ExternalLink :size="16" />
                </template>
              </Button>
            </a>

            <Button
              :label="t(needsModel ? 'setup.connectModel' : 'common.openSettings')"
              :severity="needsModel ? 'primary' : 'secondary'"
              :outlined="!needsModel"
              @click="openOptions"
            >
              <template #icon>
                <Bot
                  v-if="needsModel"
                  :size="16"
                />
              </template>
            </Button>

            <!-- справка рядом с первым запуском: вопросы про уровень и список сайтов
                 возникают именно здесь, а не когда пользователь дойдёт до настроек -->
            <a
              :href="faqUrl"
              target="_blank"
              rel="noreferrer noopener"
            >
              <Button
                severity="secondary"
                text
                :label="t('nav.faq')"
              >
                <template #icon>
                  <CircleQuestionMark :size="16" />
                </template>
              </Button>
            </a>
          </div>
        </li>
      </ol>
    </template>
  </Card>
</template>
