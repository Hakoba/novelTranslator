<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { CircleQuestionMark } from 'lucide-vue-next'
import { FAQ_URL } from '@/utils/dictionaryTab'

const { t } = useI18n()
const displayName = __DISPLAY_NAME__
const version = __VERSION__
const faqUrl = browser.runtime.getURL(FAQ_URL)

// методы
function openOptions(): void {
  browser.runtime.openOptionsPage()
}
</script>

<template>
  <Card>
    <template #title>
      {{ t('setup.updated', { name: displayName }) }}
    </template>
    <template #subtitle>
      {{ t('setup.version', { version }) }}
    </template>
    <template #content>
      <div class="flex flex-wrap gap-2 pt-2">
        <Button
          :label="t('common.openSettings')"
          @click="openOptions"
        />

        <a
          :href="faqUrl"
          target="_blank"
          rel="noreferrer noopener"
        >
          <Button
            severity="secondary"
            outlined
            :label="t('nav.faq')"
          >
            <template #icon>
              <CircleQuestionMark :size="16" />
            </template>
          </Button>
        </a>
      </div>
    </template>
  </Card>
</template>
