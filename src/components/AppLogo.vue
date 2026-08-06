<script setup lang="ts">
// `?inline` обязателен: без него @crxjs в dev-режиме отдаёт путь `/src/assets/logo.png`,
// который на странице сайта указывает в никуда — в оверлее логотип пропадал. С ним
// картинка вшивается в бандл как data-URI и в любом режиме сборки грузится отовсюду.
import logoUrl from '@/assets/logo.png?inline'

// картинка декоративная: рядом всегда стоит название, читалке экрана хватит его
withDefaults(defineProps<{ size?: number }>(), { size: 24 })
</script>

<template>
  <img
    :src="logoUrl"
    :width="size"
    :height="size"
    alt=""
    class="shrink-0"
  >
</template>
