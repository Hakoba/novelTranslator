<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Globe } from 'lucide-vue-next'
import AccessSites from '@/components/accessSites.vue'
import InlineSvg from '@/components/InlineSvg.vue'
import sitesArt from '@/assets/illustrations/sites.svg?raw'
import { useAccessSites } from '@/composables/useAccessSites'
import type { AccessMode } from '@/composables/matchesSite'

// composables
const { t } = useI18n()
const { options, isDenyMode } = useAccessSites()

// computed
const modes = computed<{ label: string; value: AccessMode }[]>(() => [
  { label: t('sites.modeAllow'), value: 'allow' },
  { label: t('sites.modeDeny'), value: 'deny' },
])
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
      <div class="flex flex-col gap-5 pt-2">
        <div class="flex flex-col gap-2">
          <span class="text-sm text-muted">{{ t('sites.mode') }}</span>
          <SelectButton
            v-model="options.mode"
            :options="modes"
            option-label="label"
            option-value="value"
            :allow-empty="false"
          />
        </div>

        <!-- защита осмысленна только там, где расширение включается само -->
        <div
          v-if="isDenyMode"
          class="flex flex-col gap-1"
        >
          <div class="flex items-center gap-2">
            <Checkbox
              v-model="options.guarded"
              input-id="access-guard"
              binary
            />
            <label
              for="access-guard"
              class="cursor-pointer"
            >
              {{ t('sites.guard') }}
            </label>
          </div>
          <small class="text-muted">{{ t('sites.guardHint') }}</small>
        </div>

        <AccessSites />
      </div>
    </template>
  </Card>
</template>
