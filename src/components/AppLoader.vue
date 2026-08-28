<script setup lang="ts">
import { computed } from 'vue'
import InlineSvg from '@/components/InlineSvg.vue'
import orbit from '@/assets/loaders/orbit.svg?raw'
import swap from '@/assets/loaders/swap.svg?raw'
import underline from '@/assets/loaders/underline.svg?raw'

/**
 * Ждём мы разного, и показываем это по-разному: `underline` — пока словарь ищет
 * слово, `swap` — пока идёт перевод, `orbit` — всё остальное (модель, экспорт).
 *
 * Картинка декоративная: рядом с ней всегда стоит текст вроде «Перевожу…»,
 * он и озвучивается.
 */
type LoaderVariant = 'underline' | 'swap' | 'orbit'

const props = withDefaults(defineProps<{ variant?: LoaderVariant; size?: number }>(), {
  variant: 'orbit',
  size: 16,
})

const MARKUP: Record<LoaderVariant, string> = { underline, swap, orbit }

const markup = computed<string>(() => MARKUP[props.variant])
</script>

<template>
  <InlineSvg
    :markup="markup"
    :style="{ width: `${size}px`, height: `${size}px` }"
    aria-hidden="true"
  />
</template>
