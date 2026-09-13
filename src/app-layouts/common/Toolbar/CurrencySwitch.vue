<template>
	<n-popselect v-model:value="currentCurrency" :options="list">
		<button
			type="button"
			class="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:border-teal-600 transition-all text-xs font-bold shadow-2xs cursor-pointer"
		>
			<Icon :size="16" name="carbon:money" class="text-emerald-600" />
			<span>{{ currentCurrency }}</span>
		</button>
	</n-popselect>
</template>

<script lang="ts" setup>
import { NPopselect } from "naive-ui"
import { computed } from "vue"
import Icon from "@/components/common/Icon.vue"
import { useCurrencyStore } from "@/stores/currency"

const currencyStore = useCurrencyStore()

const list = computed(() => currencyStore.selectOptions)

const currentCurrency = computed({
	get: () => currencyStore.currency,
	set: (v: string) => currencyStore.setCurrency(v)
})
</script>
