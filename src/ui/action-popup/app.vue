<script setup lang="ts">
import AppLogo from '@/components/AppLogo.vue'
import ThemeSwitch from '@/components/ThemeSwitch.vue'
</script>

<template>
  <div class="flex flex-col w-[380px]">
    <header class="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
      <strong class="flex items-center gap-2">
        <AppLogo :size="20" />
        Erudit
      </strong>
      <ThemeSwitch />
    </header>

    <main class="p-4">
      <RouterView />
    </main>
  </div>
</template>
