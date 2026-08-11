<template>
	<div class="max-w-60">
		<n-select v-model:value="currentLocale" :options="list" />
	</div>
</template>

<script lang="ts" setup>
import type { SelectOption } from "naive-ui"
import { NSelect } from "naive-ui"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { useLocalesStore } from "@/stores/i18n"

const localesStore = useLocalesStore()
const { setLocale } = localesStore
const { t } = useI18n()

/**
 * ADD OS: text only, no flags — same reasoning as Toolbar/LocaleSwitch.vue.
 */
const list = computed<SelectOption[]>(() =>
	localesStore.availableLocales.map(code => ({
		label: t(`locales.${code}`, `${code}`),
		value: code
	}))
)

const currentLocale = computed({
	get: () => localesStore.locale,
	set: v => setLocale(v)
})
</script>
