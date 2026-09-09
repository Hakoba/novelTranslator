<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, ShieldAlert, ShieldOff, Trash2 } from 'lucide-vue-next'
import InlineSvg from '@/components/InlineSvg.vue'
import sitesEmptyArt from '@/assets/illustrations/sites-empty.svg?raw'
import { useAccessSites } from '@/composables/useAccessSites'
import { useHostAccess } from '@/composables/useHostAccess'
import type { AccessMode } from '@/composables/matchesSite'

/**
 * Список сайтов вместе с режимом: режим задаёт, что этот список значит, и порознь
 * они читаются неверно. Поэтому переключатель живёт здесь, а не на экране настроек, —
 * и приезжает заодно на экран после установки.
 */
const { t } = useI18n()
const { options, sites, trusted, isDenyMode, addSite, removeSite, toggleSite, untrustSite } = useAccessSites()
const { hasAccess, hasAllAccess, requestAccess, requestAllAccess } = useHostAccess()

// computed
const modes = computed<{ label: string; value: AccessMode }[]>(() => [
  { label: t('sites.modeAllow'), value: 'allow' },
  { label: t('sites.modeDeny'), value: 'deny' },
])

// state
const newSiteUrl = ref<string>('')
const errorMessage = ref<string>('')

// методы
/**
 * Доступ спрашиваем до записи в список: без него сайт в списке был бы мёртвым.
 * В режиме «везде, кроме» список — исключения, там доступ не нужен.
 */
async function handleAddSite(): Promise<void> {
  errorMessage.value = ''
  const url = newSiteUrl.value.trim()

  if (!url) {
    errorMessage.value = t('sites.errorEmpty')
    return
  }

  if (!isDenyMode.value && !(await requestAccess([url]))) {
    errorMessage.value = t('sites.errorDenied')
    return
  }

  if (!addSite(url)) {
    errorMessage.value = t('sites.errorInvalid')
    return
  }

  newSiteUrl.value = ''
}

/** «Везде, кроме» — это доступ ко всем сайтам; отказал браузер — остаёмся в белом списке */
async function handleMode(mode: AccessMode): Promise<void> {
  if (mode === 'deny' && !(await requestAllAccess())) return

  options.value.mode = mode
}
</script>

<template>
  <section class="flex flex-col gap-3">
    <div class="flex flex-col gap-2">
      <span class="text-sm text-muted">{{ t('sites.mode') }}</span>
      <SelectButton
        :model-value="options.mode"
        :options="modes"
        option-label="label"
        option-value="value"
        :allow-empty="false"
        @update:model-value="handleMode"
      />
    </div>

    <!-- режим приехал синхронизацией: разрешение на этом устройстве ещё не выдано -->
    <Message
      v-if="isDenyMode && !hasAllAccess"
      severity="warn"
      size="small"
      variant="simple"
    >
      <span class="flex flex-wrap items-center gap-x-3 gap-y-1">
        {{ t('sites.allAccessHint') }}
        <Button
          size="small"
          severity="warn"
          :label="t('sites.grantAccess')"
          @click="requestAllAccess"
        >
          <template #icon>
            <ShieldAlert :size="14" />
          </template>
        </Button>
      </span>
    </Message>

    <!-- защита осмысленна только там, где расширение включается само -->
    <div
      v-if="isDenyMode"
      class="flex flex-col gap-1"
    >
      <div class="flex items-center gap-2">
        <Checkbox
          v-model="options.guarded"
          input-id="access-guard"
          binary
        />
        <label
          for="access-guard"
          class="cursor-pointer"
        >
          {{ t('sites.guard') }}
        </label>
      </div>
      <small class="text-muted">{{ t('sites.guardHint') }}</small>

      <!-- что читатель уже вывел из-под правила: снимается на самом сайте, здесь возвращается -->
      <template v-if="options.guarded">
        <ul
          v-if="trusted.length"
          class="m-0 mt-2 flex list-none flex-col gap-2 p-0"
        >
          <li
            v-for="url in trusted"
            :key="url"
            class="flex items-center gap-3 rounded-md border border-line px-3 py-2"
          >
            <ShieldOff
              :size="16"
              class="shrink-0 text-muted"
            />
            <span class="flex-1 truncate">{{ url }}</span>
            <Button
              severity="secondary"
              text
              rounded
              class="hover:!text-red-500"
              :aria-label="t('sites.guardRestore', { url })"
              @click="untrustSite(url)"
            >
              <Trash2 :size="16" />
            </Button>
          </li>
        </ul>
        <small class="mt-1 text-muted">
          {{ t(trusted.length ? 'sites.guardExceptionsHint' : 'sites.guardExceptionsEmpty') }}
        </small>
      </template>
    </div>

    <div class="flex gap-2 pt-1">
      <InputText
        v-model="newSiteUrl"
        placeholder="https://www.reddit.com/"
        class="flex-1"
        :aria-label="t('sites.address')"
        @keyup.enter="handleAddSite"
      />
      <Button
        :aria-label="t('sites.add')"
        @click="handleAddSite"
      >
        <Plus :size="16" />
      </Button>
    </div>

    <Message
      v-if="errorMessage"
      severity="error"
      size="small"
      variant="simple"
    >
      {{ errorMessage }}
    </Message>

    <small class="text-muted">
      {{ t(isDenyMode ? 'sites.hintDeny' : 'sites.hintAllow') }}
    </small>

    <ul
      v-if="sites.length"
      class="flex flex-col gap-2 m-0 p-0 list-none"
    >
      <li
        v-for="site in sites"
        :key="site.url"
        class="flex items-center gap-3 rounded-md border border-line px-3 py-2"
      >
        <ToggleSwitch
          :model-value="site.enabled"
          :aria-label="t('sites.enable', { url: site.url })"
          @update:model-value="toggleSite(site.url)"
        />
        <span
          class="flex-1 truncate"
          :class="{ 'opacity-50': !site.enabled }"
        >
          {{ site.url }}
        </span>
        <!-- запись из синхронизации: на этом устройстве доступа к сайту ещё нет -->
        <Button
          v-if="!isDenyMode && site.enabled && !hasAccess(site.url)"
          severity="warn"
          text
          size="small"
          :label="t('sites.grantAccess')"
          :title="t('sites.accessMissing')"
          @click="requestAccess([site.url])"
        >
          <template #icon>
            <ShieldAlert :size="14" />
          </template>
        </Button>
        <Button
          severity="secondary"
          text
          rounded
          class="hover:!text-red-500"
          :aria-label="t('sites.remove', { url: site.url })"
          @click="removeSite(site.url)"
        >
          <Trash2 :size="16" />
        </Button>
      </li>
    </ul>

    <div
      v-else
      class="flex flex-col items-center gap-3 py-4 text-center"
    >
      <InlineSvg
        :markup="sitesEmptyArt"
        class="w-32 text-content"
      />
      <p class="m-0 text-muted">
        {{ t(isDenyMode ? 'sites.emptyDeny' : 'sites.empty') }}
      </p>
    </div>
  </section>
</template>
