<script setup lang="ts">
import AppLogo from '@/components/AppLogo.vue'
import ThemeSwitch from '@/components/ThemeSwitch.vue'
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-6 p-6">
    <header class="flex items-center justify-between gap-2">
      <strong class="flex items-center gap-2">
        <AppLogo :size="20" />
        Erudit
      </strong>
      <ThemeSwitch />
    </header>

    <RouterView />
  </div>
</template>
