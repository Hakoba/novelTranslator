<script setup lang="ts">
import ThemeSwitch from '@/components/ThemeSwitch.vue'
</script>

<template>
  <div class="mx-auto flex max-w-xl flex-col gap-6 p-6">
    <header class="flex items-center justify-between gap-2">
      <strong>Novel Translator</strong>
      <ThemeSwitch />
    </header>

    <RouterView />
  </div>
</template>
