<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronDown, ChevronRight, CircleQuestionMark, ExternalLink } from 'lucide-vue-next'
import InlineSvg from '@/components/InlineSvg.vue'
import updatedArt from '@/assets/illustrations/updated.svg?raw'
import { FAQ_URL } from '@/utils/dictionaryTab'
import { parseTopSection, type ChangelogGroup, type ChangelogKind } from '@/utils/changelog'

/**
 * Что приехало в этой версии. Список берётся из верхнего раздела CHANGELOG — файл
 * целиком приходит в сборку через `__CHANGELOG__`. Раздел бывает на семь десятков
 * пунктов, поэтому группы свёрнуты, а у пункта показана только суть: подробности
 * открываются по клику. Раскрытие — на нативном `details`, как в справке.
 */
const { t, locale } = useI18n()

const KIND_LABEL: Record<ChangelogKind, string> = {
  added: 'setup.kindAdded',
  changed: 'setup.kindChanged',
  fixed: 'setup.kindFixed',
}

const displayName = __DISPLAY_NAME__
const version = __VERSION__
const faqUrl = browser.runtime.getURL(FAQ_URL)
const changelogUrl = `${__GITHUB_URL__}/blob/master/CHANGELOG.md`
const section = parseTopSection(__CHANGELOG__)

// список изменений ведётся на русском, а интерфейс переводится — предупреждаем остальных
const needsLangNote = computed<boolean>(() => locale.value !== 'ru')

// методы
function openOptions(): void {
  browser.runtime.openOptionsPage()
}

function groupLabel(group: ChangelogGroup): string {
  return group.kind ? t(KIND_LABEL[group.kind]) : group.title
}
</script>

<template>
  <Card>
    <template #title>
      {{ t('setup.updated', { name: displayName }) }}
    </template>
    <template #subtitle>
      {{ t('setup.version', { version }) }}
    </template>
    <template #content>
      <div class="flex flex-col gap-6 pt-2">
        <div class="flex justify-center">
          <InlineSvg
            :markup="updatedArt"
            class="w-44 text-content"
          />
        </div>

        <section
          v-if="section"
          class="flex flex-col gap-2"
        >
          <h2 class="m-0 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            {{ t('setup.changes') }}
          </h2>

          <p
            v-if="needsLangNote"
            class="m-0 pb-1 text-xs text-muted"
          >
            {{ t('setup.changesLang') }}
          </p>

          <details
            v-for="group in section.groups"
            :key="group.title"
            class="group/kind rounded-lg border border-line bg-surface-hover px-4
                   [&[open]]:bg-surface"
          >
            <summary
              class="flex cursor-pointer list-none items-center gap-3 py-3 font-medium
                     [&::-webkit-details-marker]:hidden"
            >
              <span class="flex-1">{{ groupLabel(group) }}</span>
              <span class="font-mono text-xs text-muted">{{ group.items.length }}</span>
              <ChevronDown
                :size="16"
                class="shrink-0 text-muted transition-transform group-open/kind:rotate-180"
              />
            </summary>

            <ul class="m-0 flex list-none flex-col border-t border-line p-0 py-2">
              <li
                v-for="(item, index) in group.items"
                :key="index"
              >
                <details
                  v-if="item.details"
                  class="group/item"
                >
                  <summary
                    class="flex cursor-pointer list-none items-start gap-2 py-1.5
                           [&::-webkit-details-marker]:hidden"
                  >
                    <ChevronRight
                      :size="16"
                      class="mt-0.5 shrink-0 text-muted transition-transform
                             group-open/item:rotate-90"
                    />
                    <span>{{ item.title }}</span>
                  </summary>

                  <!-- левая линия ведёт от пункта к подробности, как в справке -->
                  <p class="m-0 ml-2 border-l-2 border-mark-new pb-2 pl-4 text-muted">
                    {{ item.details }}
                  </p>
                </details>

                <p
                  v-else
                  class="m-0 py-1.5 pl-6"
                >
                  {{ item.title }}
                </p>
              </li>
            </ul>
          </details>

          <a
            :href="changelogUrl"
            target="_blank"
            rel="noreferrer noopener"
            class="mt-1 flex items-center gap-1 self-start text-xs text-muted underline"
          >
            <ExternalLink :size="14" />
            {{ t('setup.changesFull') }}
          </a>
        </section>

        <div class="flex flex-wrap gap-2">
          <Button
            :label="t('common.openSettings')"
            @click="openOptions"
          />

          <a
            :href="faqUrl"
            target="_blank"
            rel="noreferrer noopener"
          >
            <Button
              severity="secondary"
              outlined
              :label="t('nav.faq')"
            >
              <template #icon>
                <CircleQuestionMark :size="16" />
              </template>
            </Button>
          </a>
        </div>
      </div>
    </template>
  </Card>
</template>
