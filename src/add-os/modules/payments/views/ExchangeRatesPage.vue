<!-- src/add-os/modules/payments/views/ExchangeRatesPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.exchangeRates") }}</h1>
		</div>

		<ResourceStatCards v-if="!error && !isLoading && latest.length > 0" :cards="statCards" />

		<n-alert v-if="error" type="error" :title="t('exchangeRates.loadError')" />

		<div class="flex justify-end">
			<n-button type="primary" @click="openCreate">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("exchangeRates.create.button") }}
			</n-button>
		</div>

		<ResourceTable :columns :data :loading="isLoading" />

		<ResourceFormDrawer
			v-model:show="drawerVisible"
			v-model:model="form"
			:fields="exchangeRateFields(t)"
			:title="t('exchangeRates.create.title')"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submit"
		/>
	</div>
</template>

<script setup lang="ts">
import type { StatCard } from "@/add-os/components/resource/ResourceStatCards.vue"
import type { ExchangeRate, ExchangeRatePayload } from "@/add-os/modules/payments/types/exchange-rate"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceStatCards from "@/add-os/components/resource/ResourceStatCards.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import {
	buildExchangeRateColumns,
	emptyExchangeRatePayload,
	exchangeRateFields,
	latestRatesByCurrency
} from "@/add-os/modules/payments/config/exchange-rates.config"
import { createExchangeRate, listExchangeRates } from "@/add-os/services/exchange-rates"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()

const { data, isLoading, error, refetch } = useResourceList<ExchangeRate>(listExchangeRates)
const latest = computed(() => latestRatesByCurrency(data.value))
const latestIds = computed(() => new Set(latest.value.map(rate => rate.id)))
const columns = computed(() => buildExchangeRateColumns(t, latestIds.value))

const statCards = computed<StatCard[]>(() => {
	const usd = latest.value.find(rate => rate.currency_code === "USD")
	return usd ? [{ label: t("exchangeRates.stats.latestUsd"), value: formatNumber(usd.rate_to_base, { fractionDigits: 4 }) }] : []
})

/**
 * Exchange Rates has no update/delete endpoint (verification report) — those two
 * are never invoked, only present to satisfy useResourceMutations' shared shape.
 */
const mutations = useResourceMutations(
	{
		create: createExchangeRate,
		update: () => Promise.reject(new Error("Exchange rates cannot be updated.")),
		remove: () => Promise.reject(new Error("Exchange rates cannot be deleted."))
	},
	refetch,
	{
		createSuccess: t("exchangeRates.create.success"),
		updateSuccess: t("exchangeRates.create.success"),
		deleteSuccess: t("exchangeRates.create.success")
	}
)

const drawerVisible = ref(false)
const form = ref<ExchangeRatePayload>(emptyExchangeRatePayload())

function openCreate() {
	form.value = emptyExchangeRatePayload()
	drawerVisible.value = true
}

async function submit(payload: Record<string, unknown>) {
	const effectiveFrom = String(payload.effective_from)
	await mutations.create({ ...payload, effective_from: `${effectiveFrom}T00:00:00Z` } as unknown as ExchangeRatePayload)
}
</script>
