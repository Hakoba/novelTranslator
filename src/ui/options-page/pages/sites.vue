<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Globe } from 'lucide-vue-next'
import AccessSites from '@/components/accessSites.vue'
import InlineSvg from '@/components/InlineSvg.vue'
import sitesArt from '@/assets/illustrations/sites.svg?raw'

const { t } = useI18n()
</script>

<template>
  <Card>
    <template #title>
      <div class="flex items-center justify-between gap-4">
        <span class="flex items-center gap-2">
          <Globe :size="20" />
          {{ t('settings.sites.title') }}
        </span>
        <InlineSvg
          :markup="sitesArt"
          class="w-20 text-content"
        />
      </div>
    </template>
    <template #subtitle>
      {{ t('settings.sites.subtitle') }}
    </template>
    <template #content>
      <div class="pt-2">
        <AccessSites />
      </div>
    </template>
  </Card>
</template>
