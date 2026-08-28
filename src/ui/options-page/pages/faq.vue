<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ChevronDown, CircleQuestionMark, ExternalLink } from 'lucide-vue-next'
import InlineSvg from '@/components/InlineSvg.vue'
import faqArt from '@/assets/illustrations/faq.svg?raw'

/**
 * Справка внутри расширения: короткие ответы на то, обо что спотыкаются на практике.
 * Исчерпывающая версия живёт в репозитории — держать её в шести локалях незачем,
 * поэтому внизу ссылка.
 *
 * Раскрытие — на нативном `details`: доступность и клавиатура достаются даром,
 * состояние хранить не нужно.
 */
const { t } = useI18n()

const FAQ_DOC_URL = `${__GITHUB_URL__}/blob/master/docs/FAQ.md`

/** Ключ вопроса даёт пару ключей локали: `<id>Q` и `<id>A` */
const GROUPS: { label: string; items: string[] }[] = [
  { label: 'start', items: ['free', 'silent', 'panel'] },
  { label: 'words', items: ['level', 'engine', 'colors', 'simple'] },
  { label: 'page', items: ['area', 'reread'] },
  { label: 'dictionary', items: ['repeat', 'sync', 'anki'] },
  { label: 'privacy', items: ['local', 'data'] },
]
</script>

<template>
  <Card>
    <template #title>
      <span class="flex items-center gap-2">
        <CircleQuestionMark :size="20" />
        {{ t('faq.title') }}
      </span>
    </template>
    <template #content>
      <div class="flex max-w-3xl flex-col gap-8 pt-2">
        <!-- картинка показывает то же, что список ниже: раскрытый вопрос и свёрнутый.
             Ссылка на полный FAQ стоит здесь, а не в конце: до конца ещё долистать -->
        <div class="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-xl border border-line bg-surface-hover p-5">
          <InlineSvg
            :markup="faqArt"
            class="w-32 text-content"
          />

          <div class="flex min-w-56 flex-1 flex-col items-start gap-3">
            <p class="m-0 text-muted">
              {{ t('faq.subtitle') }}
            </p>
            <a
              :href="FAQ_DOC_URL"
              target="_blank"
              rel="noreferrer noopener"
            >
              <Button
                severity="secondary"
                outlined
                size="small"
                :label="t('faq.full')"
              >
                <template #icon>
                  <ExternalLink :size="16" />
                </template>
              </Button>
            </a>
          </div>
        </div>

        <section
          v-for="group in GROUPS"
          :key="group.label"
          class="flex flex-col gap-2"
        >
          <!-- разрядка и размер вместо жирного: подпись группы не должна спорить с вопросами -->
          <h2 class="m-0 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            {{ t(`faq.group.${group.label}`) }}
          </h2>

          <details
            v-for="(item, index) in group.items"
            :key="item"
            class="group rounded-lg border border-line bg-surface-hover px-4
                   [&[open]]:bg-surface"
          >
            <summary
              class="flex cursor-pointer list-none items-center gap-3 py-3 font-medium
                     [&::-webkit-details-marker]:hidden"
            >
              <!-- нумерация моноширинным: та же деталь, что на сайте расширения -->
              <span class="font-mono text-xs text-muted">
                {{ String(index + 1).padStart(2, '0') }}
              </span>
              <span class="flex-1">{{ t(`faq.${item}Q`) }}</span>
              <ChevronDown
                :size="16"
                class="shrink-0 text-muted transition-transform group-open:rotate-180"
              />
            </summary>

            <!-- левая линия ведёт от вопроса к ответу и отделяет его от следующего -->
            <p class="m-0 border-l-2 border-mark-new pb-4 pl-4 text-muted">
              {{ t(`faq.${item}A`) }}
            </p>
          </details>
        </section>
      </div>
    </template>
  </Card>
</template>
