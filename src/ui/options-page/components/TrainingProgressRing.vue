<script setup lang="ts">
import { computed } from 'vue'
import type { DictionaryProgress } from '@/utils/srs'

/**
 * Состав словаря кольцом: освоенное, в работе и ни разу не повторённое.
 * Доли считаются в процентах напрямую — `pathLength="100"` избавляет от длины
 * окружности в формулах, и `stroke-dasharray` можно писать как есть.
 */
const props = defineProps<{
  progress: DictionaryProgress
  stages: { key: keyof DictionaryProgress; stroke: string }[]
}>()

/** Зазор между дугами в тех же процентах; на единственной дуге его быть не должно */
const GAP = 2

interface RingArc {
  key: string
  stroke: string
  dash: string
  offset: number
}

const total = computed<number>(
  () => props.progress.fresh + props.progress.learning + props.progress.learned,
)

const arcs = computed<RingArc[]>(() => {
  const filled = props.stages.filter((stage) => props.progress[stage.key] > 0)
  const gap = filled.length > 1 ? GAP : 0
  let cursor = 0

  return filled.map((stage) => {
    const length = (props.progress[stage.key] / total.value) * 100
    const offset = cursor
    cursor += length

    return {
      key: stage.key,
      stroke: stage.stroke,
      dash: `${Math.max(length - gap, 0.5)} 100`,
      offset,
    }
  })
})
</script>

<template>
  <svg
    viewBox="0 0 120 120"
    class="size-full -rotate-90"
    aria-hidden="true"
  >
    <circle
      cx="60"
      cy="60"
      r="52"
      fill="none"
      stroke-width="12"
      class="stroke-line opacity-40"
    />
    <circle
      v-for="arc in arcs"
      :key="arc.key"
      cx="60"
      cy="60"
      r="52"
      fill="none"
      stroke-width="12"
      pathLength="100"
      :class="arc.stroke"
      :stroke-dasharray="arc.dash"
      :stroke-dashoffset="-arc.offset"
    />
  </svg>
</template>
