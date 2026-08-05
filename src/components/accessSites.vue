<script setup lang="ts">
import { ref } from 'vue'
import { Plus, Trash2 } from 'lucide-vue-next'
import { useAccessSites } from '@/composables/useAccessSites'

const { sites, addSite, removeSite, toggleSite } = useAccessSites()

// state
const newSiteUrl = ref<string>('')
const errorMessage = ref<string>('')

// методы
function handleAddSite(): void {
  errorMessage.value = ''
  const url = newSiteUrl.value.trim()

  if (!url) {
    errorMessage.value = 'Введите адрес сайта'
    return
  }

  if (!addSite(url)) {
    errorMessage.value = 'Некорректный адрес или сайт уже в списке'
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
        placeholder="https://novelbin.com/"
        class="flex-1"
        aria-label="Адрес сайта"
        @keyup.enter="handleAddSite"
      />
      <Button
        aria-label="Добавить сайт"
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
      Адрес целиком, с протоколом. Поддомены — https://*.novelbin.com, путь — префиксом.
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
          :aria-label="`Включить ${site.url}`"
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
          :aria-label="`Удалить ${site.url}`"
          @click="removeSite(site.url)"
        >
          <Trash2 :size="16" />
        </Button>
      </li>
    </ul>

    <p
      v-else
      class="text-muted m-0"
    >
      Список пуст — расширение не будет работать нигде.
    </p>
  </section>
</template>
