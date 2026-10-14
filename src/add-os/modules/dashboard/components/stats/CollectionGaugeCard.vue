<!-- src/add-os/modules/dashboard/components/stats/CollectionGaugeCard.vue -->
<!--
	How much of everything invoiced has been collected, in one currency at a
	time — every invoice, not the period's: what is owed does not reset monthly.
-->
<template>
	<StatCard :title="t('dashboard.stats.collectionRate')" :note="t('dashboard.stats.allInvoices')" :is-loading :error :ready @retry="emit('retry')">
		<template #filters>
			<div class="w-28">
				<n-select v-model:value="currency" :options size="small" />
			</div>
		</template>
		<GaugeChart :value="percent" :tone="rateTone(percent, 80, 50)" :caption />
	</StatCard>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { RevenueTotal } from "@/add-os/services/reports"
import { NSelect } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import GaugeChart from "@/add-os/modules/dashboard/components/stats/GaugeChart.vue"
import StatCard from "@/add-os/modules/dashboard/components/stats/StatCard.vue"
import { rateTone } from "@/add-os/modules/dashboard/config/tones"
import { formatReportMoney } from "@/add-os/services/reports"

const props = defineProps<{
	totals: RevenueTotal[]
	isLoading: boolean
	error: unknown
	ready: boolean
}>()

const emit = defineEmits<{
	(e: "retry"): void
}>()

const { t } = useI18n()

const currency = ref<string | null>(null)

// The first currency once the totals arrive, and again if the one picked goes.
watch(() => props.totals, totals => {
	if (!totals.some(row => row.currency === currency.value)) currency.value = totals[0]?.currency ?? null
}, { immediate: true })

const options = computed<SelectOption[]>(() => props.totals.map(row => ({ label: row.currency, value: row.currency })))
const row = computed(() => props.totals.find(r => r.currency === currency.value) ?? null)

const percent = computed(() => {
	const billed = Number.parseFloat(row.value?.billed ?? "0")
	return billed > 0 ? (Number.parseFloat(row.value?.paid ?? "0") / billed) * 100 : null
})

const caption = computed(() => (row.value
	? t("dashboard.stats.collectedOf", { paid: formatReportMoney(row.value.paid, row.value.currency), billed: formatReportMoney(row.value.billed, row.value.currency) })
	: ""))
</script>
