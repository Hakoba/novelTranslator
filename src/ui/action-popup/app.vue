<script setup lang="ts">
import ThemeSwitch from '@/components/ThemeSwitch.vue'
</script>

<template>
  <div class="flex flex-col w-[380px]">
    <header class="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
      <strong>Novel Translator</strong>
      <ThemeSwitch />
    </header>

    <main class="p-4">
      <RouterView />
    </main>
  </div>
</template>
