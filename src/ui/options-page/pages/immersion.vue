<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Replace } from 'lucide-vue-next'
import InlineSvg from '@/components/InlineSvg.vue'
import immersionArt from '@/assets/illustrations/immersion.svg?raw'
import { useReaderSettings } from '@/composables/useReaderSettings'

/**
 * Режим вкраплений — единственная фича, которая работает не на странице чтения,
 * а на страницах родного языка, поэтому одним тумблером в «Чтении» её не объяснить:
 * здесь тумблер, механика по шагам и то, чего режим не умеет.
 */
const { t } = useI18n()
const { settings } = useReaderSettings()

/** Ключи шагов и ограничений — в порядке показа */
const STEPS: string[] = ['detect', 'swap', 'answer', 'panel']
const LIMITS: string[] = ['limitScript', 'limitForms']
</script>

<template>
  <Card>
    <template #title>
      <span class="flex items-center gap-2">
        <Replace :size="20" />
        {{ t('immersion.title') }}
      </span>
    </template>
    <template #subtitle>
      {{ t('immersion.subtitle') }}
    </template>
    <template #content>
      <div class="flex max-w-3xl flex-col gap-8 pt-2">
        <div class="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-xl border border-line bg-surface-hover p-5">
          <InlineSvg
            :markup="immersionArt"
            class="w-32 text-content"
          />

          <div class="flex min-w-56 flex-1 flex-col gap-2">
            <div class="flex items-center gap-2">
              <ToggleSwitch
                v-model="settings.immersion"
                input-id="immersion"
              />
              <label for="immersion">
                {{ t('immersion.toggle') }}
              </label>
            </div>
            <small class="text-muted">
              {{ t('immersion.toggleHint') }}
            </small>
          </div>
        </div>

        <section class="flex flex-col gap-3">
          <h2 class="m-0 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            {{ t('immersion.howTitle') }}
          </h2>
          <ol class="m-0 flex list-none flex-col gap-3 p-0">
            <li
              v-for="(step, index) in STEPS"
              :key="step"
              class="flex gap-3"
            >
              <!-- нумерация моноширинным — та же деталь, что в справке -->
              <span class="pt-0.5 font-mono text-xs text-muted">
                {{ String(index + 1).padStart(2, '0') }}
              </span>
              <p class="m-0 border-l-2 border-mark-saved pl-4">
                {{ t(`immersion.${step}`) }}
              </p>
            </li>
          </ol>
        </section>

        <section class="flex flex-col gap-3">
          <h2 class="m-0 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            {{ t('immersion.limitsTitle') }}
          </h2>
          <ul class="m-0 flex list-none flex-col gap-2 p-0">
            <li
              v-for="limit in LIMITS"
              :key="limit"
              class="m-0 text-muted"
            >
              {{ t(`immersion.${limit}`) }}
            </li>
          </ul>
        </section>
      </div>
    </template>
  </Card>
</template>
