<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Globe } from 'lucide-vue-next'
import AccessSites from '@/components/accessSites.vue'

const { t } = useI18n()
</script>

<template>
  <Card>
    <template #title>
      <span class="flex items-center gap-2">
        <Globe :size="20" />
        {{ t('settings.sites.title') }}
      </span>
    </template>
    <template #subtitle>
      {{ t('settings.sites.subtitle') }}
    </template>
    <template #content>
      <div class="max-w-2xl pt-2">
        <AccessSites />
      </div>
    </template>
  </Card>
</template>
