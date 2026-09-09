<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ShieldCheck } from 'lucide-vue-next'
import { hostsOf, useHostAccess } from '@/composables/useHostAccess'
import { isValidUrl } from '@/composables/matchesSite'

/**
 * Предупреждение под полем адреса: запросы к сервису не уйдут, пока браузер
 * не выдал доступ к его хосту. Молчит, если доступ есть или адреса ещё нет.
 */
const props = defineProps<{ urls: string[] }>()

const { t } = useI18n()
const { hasAccess, requestAccess } = useHostAccess()

// computed
const missing = computed<string[]>(() => props.urls.filter((url) => isValidUrl(url) && !hasAccess(url)))
</script>

<template>
  <Message
    v-if="missing.length"
    severity="warn"
    size="small"
    variant="simple"
  >
    <span class="flex flex-wrap items-center gap-x-3 gap-y-1">
      {{ t('hostAccess.needed', { hosts: hostsOf(missing) }) }}
      <Button
        size="small"
        severity="warn"
        :label="t('hostAccess.allow')"
        @click="requestAccess(missing)"
      >
        <template #icon>
          <ShieldCheck :size="14" />
        </template>
      </Button>
    </span>
  </Message>
</template>
