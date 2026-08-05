<script setup lang="ts">
import { ref } from 'vue'
import { useAccessSites } from '@/composables/useAccessSites'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import ToggleSwitch from 'primevue/toggleswitch'
import Card from 'primevue/card'
import { Trash2, Plus } from 'lucide-vue-next'

const { sites, addSite, removeSite, toggleSite } = useAccessSites()

const newSiteUrl = ref<string>('')
const errorMessage = ref<string>('')

function handleAddSite(): void {
  errorMessage.value = ''
  
  if (!newSiteUrl.value.trim()) {
    errorMessage.value = 'Введите URL сайта'
    return
  }

  const success = addSite(newSiteUrl.value.trim())
  
  if (!success) {
    errorMessage.value = 'Неверный URL или сайт уже добавлен'
    return
  }

  newSiteUrl.value = ''
}

function handleRemoveSite(url: string): void {
  removeSite(url)
}

function handleToggleSite(url: string): void {
  toggleSite(url)
}
</script>

<template>
  <Card>
    <template #title>
      Разрешенные сайты
    </template>
    <template #subtitle>
      Расширение будет работать только на перечисленных сайтах
    </template>
    <template #content>
      <div class="space-y-4">
        <div class="flex gap-2">
          <input
            v-model="newSiteUrl"
            type="url"
            placeholder="https://example.com/"
            class="flex-1"
            @keyup.enter="handleAddSite"
          />
          <Button
            size="icon"
            @click="handleAddSite"
          >
            <Plus class="h-4 w-4" />
          </Button>
        </div>
        
        <p
          v-if="errorMessage"
          class="text-sm text-red-500"
        >
          {{ errorMessage }}
        </p>

        <ul
          v-if="sites.length > 0"
          class="space-y-2"
        >
          <li
            v-for="site in sites"
            :key="site.url"
            class="flex items-center justify-between gap-4 p-3 rounded-lg border"
          >
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <ToggleSwitch
                :model-value="site.enabled"
                @update:model-value="handleToggleSite(site.url)"
              />
              <span
                class="text-sm truncate"
                :class="{ 'opacity-50': !site.enabled }"
              >
                {{ site.url }}
              </span>
            </div>
            <Button
              severity="secondary"
              text
              class="shrink-0"
              @click="handleRemoveSite(site.url)"
            >
              <Trash2 class="h-4 w-4" />
            </Button>
          </li>
        </ul>

        <p
          v-else
          class="text-sm opacity-50 text-center py-4"
        >
          Нет добавленных сайтов
        </p>
      </div>
    </template>
  </Card>
</template>
