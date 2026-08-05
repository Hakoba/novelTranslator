<script setup lang="ts">
import ThemeSwitch from '@/components/ThemeSwitch.vue'
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-6 p-6">
    <header class="flex items-center justify-between gap-2">
      <h1 class="m-0 text-xl font-semibold">
        Настройки Novel Translator
      </h1>
      <ThemeSwitch />
    </header>

    <RouterView />
  </div>
</template>
