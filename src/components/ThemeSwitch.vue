<script setup lang="ts">
import { Moon, Sun } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useTheme } from '@/composables/useTheme'

const { t } = useI18n()
const { isDark, toggleDark } = useTheme()
</script>

<template>
  <Button
    severity="secondary"
    text
    rounded
    :aria-label="t(isDark ? 'nav.lightTheme' : 'nav.darkTheme')"
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
