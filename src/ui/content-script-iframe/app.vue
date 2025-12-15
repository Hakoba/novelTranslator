<script setup lang="ts">
import { ref } from 'vue'

// state
const isStarted = ref<boolean>(false)

// methods
function handleStart(): void {
  isStarted.value = true
}
</script>

<template>
  <div>
    <div v-if="!isStarted">
      <UButton type="button" @click="handleStart">Начать работу</UButton>
    </div>
    <UApp v-else>
      <AppHeader />

      <div class="p-4 prose dark:prose-invert">
        <RouterView />
      </div>

      <AppFooter />
    </UApp>
  </div>
</template>

<style scoped></style>
