<script setup lang="ts">
import { BookMarked, Settings } from 'lucide-vue-next'
import ThemeSwitch from '@/components/ThemeSwitch.vue'

const LINK_CLASS =
  'flex items-center gap-2 rounded-md px-3 py-2 text-content no-underline hover:bg-surface-hover'
const ACTIVE_LINK_CLASS = 'bg-surface-hover font-semibold'
</script>

<template>
  <div class="mx-auto flex max-w-4xl flex-col gap-6 p-6">
    <header class="flex items-center justify-between gap-2">
      <h1 class="m-0 text-xl font-semibold">
        Novel Translator
      </h1>
      <ThemeSwitch />
    </header>

    <div class="flex flex-col gap-6 sm:flex-row">
      <nav
        class="flex shrink-0 gap-1 sm:w-48 sm:flex-col"
        aria-label="Разделы"
      >
        <RouterLink
          to="/options-page"
          :class="LINK_CLASS"
          :exact-active-class="ACTIVE_LINK_CLASS"
        >
          <Settings :size="18" />
          Настройки
        </RouterLink>
        <RouterLink
          to="/options-page/dictionary"
          :class="LINK_CLASS"
          :exact-active-class="ACTIVE_LINK_CLASS"
        >
          <BookMarked :size="18" />
          Словарь
        </RouterLink>
      </nav>

      <main class="flex min-w-0 flex-1 flex-col gap-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>
