<script setup lang="ts">
import { Moon, Sun } from 'lucide-vue-next'
import { useTheme } from '@/composables/useTheme'

const { isDark, toggleDark } = useTheme()
</script>

<template>
  <Button
    severity="secondary"
    text
    rounded
    :aria-label="isDark ? 'Светлая тема' : 'Тёмная тема'"
    @click="toggleDark"
  >
    <Sun
      v-if="isDark"
      :size="18"
    />
    <Moon
      v-else
      :size="18"
    />
  </Button>
</template>
