<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, Trash2 } from 'lucide-vue-next'
import InlineSvg from '@/components/InlineSvg.vue'
import sitesEmptyArt from '@/assets/illustrations/sites-empty.svg?raw'
import { useAccessSites } from '@/composables/useAccessSites'

const { t } = useI18n()
const { sites, isDenyMode, addSite, removeSite, toggleSite } = useAccessSites()

// state
const newSiteUrl = ref<string>('')
const errorMessage = ref<string>('')

// методы
function handleAddSite(): void {
  errorMessage.value = ''
  const url = newSiteUrl.value.trim()

  if (!url) {
    errorMessage.value = t('sites.errorEmpty')
    return
  }

  if (!addSite(url)) {
    errorMessage.value = t('sites.errorInvalid')
    return
  }

  newSiteUrl.value = ''
}
</script>

<template>
  <section class="flex flex-col gap-3">
    <div class="flex gap-2">
      <InputText
        v-model="newSiteUrl"
        placeholder="https://www.reddit.com/"
        class="flex-1"
        :aria-label="t('sites.address')"
        @keyup.enter="handleAddSite"
      />
      <Button
        :aria-label="t('sites.add')"
        @click="handleAddSite"
      >
        <Plus :size="16" />
      </Button>
    </div>

    <Message
      v-if="errorMessage"
      severity="error"
      size="small"
      variant="simple"
    >
      {{ errorMessage }}
    </Message>

    <small class="text-muted">
      {{ t(isDenyMode ? 'sites.hintDeny' : 'sites.hintAllow') }}
    </small>

    <ul
      v-if="sites.length"
      class="flex flex-col gap-2 m-0 p-0 list-none"
    >
      <li
        v-for="site in sites"
        :key="site.url"
        class="flex items-center gap-3 rounded-md border border-line px-3 py-2"
      >
        <ToggleSwitch
          :model-value="site.enabled"
          :aria-label="t('sites.enable', { url: site.url })"
          @update:model-value="toggleSite(site.url)"
        />
        <span
          class="flex-1 truncate"
          :class="{ 'opacity-50': !site.enabled }"
        >
          {{ site.url }}
        </span>
        <Button
          severity="secondary"
          text
          rounded
          class="hover:!text-red-500"
          :aria-label="t('sites.remove', { url: site.url })"
          @click="removeSite(site.url)"
        >
          <Trash2 :size="16" />
        </Button>
      </li>
    </ul>

    <div
      v-else
      class="flex flex-col items-center gap-3 py-4 text-center"
    >
      <InlineSvg
        :markup="sitesEmptyArt"
        class="w-32 text-content"
      />
      <p class="m-0 text-muted">
        {{ t(isDenyMode ? 'sites.emptyDeny' : 'sites.empty') }}
      </p>
    </div>
  </section>
</template>
