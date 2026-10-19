<template>
	<n-select
		v-model:value="value"
		:options
		:loading
		:placeholder="t('hrPayroll.currency')"
		:clearable
		:aria-label="t('hrPayroll.currency')"
		filterable
	/>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { CurrencyOption } from "@/add-os/modules/hr/types/payroll"
import { NSelect } from "naive-ui"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { ApiError } from "@/add-os/services/api"
import { listCurrencyOptions } from "@/add-os/services/hr/payroll"

/**
 * One of ADD's active currencies, by code — the same list the server checks
 * every HR amount against. A code already on a record but no longer active
 * stays offered, so editing that record does not lose it.
 */
defineProps<{ clearable?: boolean }>()
const value = defineModel<string | null>("value", { required: true })

const { t } = useI18n()
const currencies = ref<CurrencyOption[]>([])
const loading = ref(true)

onMounted(async () => {
	try {
		currencies.value = await listCurrencyOptions()
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	} finally {
		loading.value = false
	}
})

const options = computed<SelectOption[]>(() => {
	const list = currencies.value.map(c => ({ label: c.name ? `${c.code} · ${c.name}` : c.code, value: c.code }))
	if (value.value && !list.some(o => o.value === value.value)) list.unshift({ label: value.value, value: value.value })
	return list
})
</script>
