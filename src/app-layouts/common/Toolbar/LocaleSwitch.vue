<template>
	<n-popselect v-model:value="currentLocale" :options="list">
		<Icon :size="19" :name="MultiLanguageIcon" />
	</n-popselect>
</template>

<script lang="ts" setup>
import type { SelectOption } from "naive-ui"
import { NPopselect } from "naive-ui"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import Icon from "@/components/common/Icon.vue"
import { useLocalesStore } from "@/stores/i18n"

const MultiLanguageIcon = "ion:language-outline"
const localesStore = useLocalesStore()
const { setLocale } = localesStore
const { t } = useI18n()

/**
 * ADD OS: text only, no flags.
 *
 * The template rendered `circle-flags:${localeCode}` beside each name. A language
 * is not a country — Arabic spans many, English is global — and the codes did not
 * even resolve: `circle-flags:ar` is Argentina's flag and `circle-flags:en` does
 * not exist. The label now comes from `locales.*`, so it translates with the app.
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
