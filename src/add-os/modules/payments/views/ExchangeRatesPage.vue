<!-- src/add-os/modules/payments/views/ExchangeRatesPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.exchangeRates") }}</h1>
		</div>

		<!-- Daily Suggestion Card (sp-today) -->
		<div
			v-if="suggestion && suggestion.id"
			class="rounded-xl border border-amber-300 dark:border-amber-700/60 bg-gradient-to-r from-amber-50/80 via-orange-50/50 to-amber-50/80 dark:from-amber-950/20 dark:via-orange-950/10 dark:to-amber-950/20 p-4 sm:p-5 shadow-xs transition-all"
		>
			<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div class="flex items-start gap-3">
					<div class="w-10 h-10 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
						<Icon name="carbon:cloud-download" :size="22" />
					</div>
					<div class="flex flex-col gap-1">
						<div class="flex items-center gap-2 flex-wrap">
							<span class="font-bold text-base text-stone-900 dark:text-stone-100">
								{{ t("exchangeRates.suggestion.title") }}
							</span>
							<n-tag
								v-if="suggestion.deviation_percent !== null"
								:type="suggestionDeviationType"
								round
								size="small"
							>
								{{ suggestion.deviation_percent > 0 ? '+' : '' }}{{ formatNumber(suggestion.deviation_percent, { fractionDigits: 2 }) }}%
							</n-tag>
							<n-tag v-if="suggestion.source_stale" type="error" round size="small">
								{{ t("exchangeRates.suggestion.staleWarning") }}
							</n-tag>
						</div>
						<p class="text-xs text-stone-600 dark:text-stone-300">
							{{ t("exchangeRates.suggestion.description") }}
						</p>
						<div class="flex items-center gap-4 text-xs text-stone-500 dark:text-stone-400 mt-1 flex-wrap">
							<span class="font-medium text-stone-800 dark:text-stone-200">
								{{ t("exchangeRates.suggestion.rate") }}:
								<span class="text-sm font-bold text-teal-700 dark:text-teal-400">
									1 USD = {{ formatNumber(Number(suggestion.rate_usd_to_syp), { fractionDigits: 0 }) }} ل.س
								</span>
							</span>
							<span v-if="suggestion.fetched_at">
								{{ t("exchangeRates.suggestion.fetchedAt") }}: {{ formatDate(suggestion.fetched_at, { style: "dateTime" }) }}
							</span>
						</div>
					</div>
				</div>

				<div class="flex items-center gap-2 shrink-0 self-end md:self-center flex-wrap">
					<n-button
						type="primary"
						secondary
						size="medium"
						:loading="isAccepting"
						@click="acceptSuggestion"
					>
						<template #icon>
							<Icon name="carbon:checkmark" :size="16" />
						</template>
						{{ t("exchangeRates.suggestion.accept") }}
					</n-button>
					<n-button
						type="warning"
						secondary
						size="medium"
						@click="editSuggestion"
					>
						<template #icon>
							<Icon name="carbon:edit" :size="16" />
						</template>
						{{ t("exchangeRates.suggestion.modifyAndAccept") }}
					</n-button>
					<n-button
						quaternary
						size="medium"
						@click="confirmDismissSuggestion"
					>
						<template #icon>
							<Icon name="carbon:close" :size="16" />
						</template>
						{{ t("exchangeRates.suggestion.dismiss") }}
					</n-button>
				</div>
			</div>
		</div>

		<ResourceStatCards v-if="!error && !isLoading && latest.length > 0" :cards="statCards" />

		<n-alert v-if="error" type="error" :title="t('exchangeRates.loadError')" />

		<div class="flex justify-end items-center gap-3">
			<n-button
				secondary
				class="font-medium px-3 py-2 rounded-lg inline-flex items-center gap-2"
				:loading="isSyncing"
				@click="handleSync"
			>
				<template #icon>
					<Icon name="carbon:renew" :size="16" />
				</template>
				{{ t("exchangeRates.sync.button") }}
			</n-button>

			<n-button
				type="primary"
				class="!bg-[var(--add-primary)] hover:!bg-[var(--add-primary-hover)] !text-white font-medium shadow-sm px-4 py-2 rounded-lg inline-flex items-center gap-2"
				@click="openCreate"
			>
				<template #icon>
					<span class="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
						<Icon name="carbon:add" :size="14" color="#ffffff" />
					</span>
				</template>
				{{ t("exchangeRates.create.button") }}
			</n-button>
		</div>

		<ResourceTable :columns :data :loading="isLoading" />

		<ResourceFormDrawer
			v-model:show="drawerVisible"
			v-model:model="form"
			:fields="fields"
			:title="t('exchangeRates.create.title')"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submit"
		/>
	</div>
</template>

<script setup lang="ts">
import type { StatCard } from "@/add-os/components/resource/ResourceStatCards.vue"
import type { Currency } from "@/add-os/modules/payments/types/currency"
import type { ExchangeRate, ExchangeRatePayload, ExchangeRateSuggestion } from "@/add-os/modules/payments/types/exchange-rate"
import { NAlert, NButton, NTag, useDialog, useMessage } from "naive-ui"
import { computed, onMounted, ref } from "vue"
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
import { listCurrencies } from "@/add-os/services/currencies"
import {
	createExchangeRate,
	dismissExchangeRateSuggestion,
	getExchangeRateSuggestion,
	listExchangeRates,
	syncExchangeRates
} from "@/add-os/services/exchange-rates"
import { formatDate, formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()

const { data, isLoading, error, refetch } = useResourceList<ExchangeRate>(listExchangeRates)
const { data: currenciesData } = useResourceList<Currency>(listCurrencies)

const suggestion = ref<ExchangeRateSuggestion | null>(null)
const isAccepting = ref(false)
const isSyncing = ref(false)

async function fetchSuggestion() {
	try {
		const res = await getExchangeRateSuggestion()
		suggestion.value = res?.id ? res : null
	} catch {
		suggestion.value = null
	}
}

onMounted(() => {
	fetchSuggestion()
})

const suggestionDeviationType = computed(() => {
	const dev = Math.abs(suggestion.value?.deviation_percent ?? 0)
	if (dev > 5) return "error"
	if (dev > 2) return "warning"
	return "success"
})

const currencyOptions = computed(() => {
	const nonBase = (currenciesData.value || []).filter(c => !c.is_base && c.is_active)
	if (nonBase.length === 0) {
		return [{ label: "SYP (ليرة سورية)", value: "SYP" }]
	}
	return nonBase.map(c => ({
		label: `${c.code} (${c.name.ar || c.name.en || c.code})`,
		value: c.code
	}))
})

const fields = computed(() => exchangeRateFields(t, currencyOptions.value))
const latest = computed(() => latestRatesByCurrency(data.value))
const latestIds = computed(() => new Set(latest.value.map(rate => rate.id)))
const columns = computed(() => buildExchangeRateColumns(t, latestIds.value))

const statCards = computed<StatCard[]>(() => {
	const syp = latest.value.find(rate => rate.currency_code === "SYP")
	const usd = latest.value.find(rate => rate.currency_code === "USD")
	const target = syp || usd
	if (!target) return []
	const num = Number(target.rate_to_base)
	const displayValue = num > 0 && num < 1 ? Math.round(1 / num) : num
	return [{
		label: t("exchangeRates.stats.latestUsd"),
		value: `${formatNumber(displayValue, { fractionDigits: 0 })} ل.س`
	}]
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
	const defaultCode = (currencyOptions.value[0]?.value as string) || "SYP"
	form.value = emptyExchangeRatePayload(defaultCode)
	drawerVisible.value = true
}

async function acceptSuggestion() {
	if (!suggestion.value?.id) return
	try {
		isAccepting.value = true
		const rateToBase = suggestion.value.suggested_rate_to_base
			?? (Number(suggestion.value.rate_usd_to_syp) > 0 ? Number((1 / Number(suggestion.value.rate_usd_to_syp)).toFixed(10)) : 0)

		await createExchangeRate({
			currency_code: "SYP",
			rate_to_base: rateToBase,
			effective_from: new Date().toISOString(),
			suggestion_id: suggestion.value.id
		})
		message.success(t("exchangeRates.suggestion.acceptSuccess"))
		await refetch()
		await fetchSuggestion()
	} catch (caught: any) {
		message.error(caught?.data?.message || t("resourceCrud.mutations.genericError"))
	} finally {
		isAccepting.value = false
	}
}

function editSuggestion() {
	if (!suggestion.value) return
	const marketRate = Math.round(Number(suggestion.value.rate_usd_to_syp)) || 0
	form.value = {
		currency_code: "SYP",
		rate_to_base: marketRate,
		effective_from: new Date().toISOString().split("T")[0],
		suggestion_id: suggestion.value.id
	}
	drawerVisible.value = true
}

function confirmDismissSuggestion() {
	if (!suggestion.value?.id) return
	dialog.warning({
		title: t("exchangeRates.suggestion.dismissConfirmTitle"),
		content: t("exchangeRates.suggestion.dismissConfirmContent"),
		positiveText: t("common.delete") || "تأكيد",
		negativeText: t("common.close") || "إلغاء",
		onPositiveClick: async () => {
			try {
				await dismissExchangeRateSuggestion(suggestion.value!.id!)
				message.success(t("exchangeRates.suggestion.dismissSuccess"))
				await fetchSuggestion()
			} catch (caught: any) {
				message.error(caught?.data?.message || t("resourceCrud.mutations.genericError"))
			}
		}
	})
}

async function handleSync() {
	try {
		isSyncing.value = true
		const res = await syncExchangeRates()
		message.success(res?.message || t("exchangeRates.sync.success"))
		await refetch()
		await fetchSuggestion()
	} catch (caught: any) {
		message.error(caught?.data?.message || t("resourceCrud.mutations.genericError"))
	} finally {
		isSyncing.value = false
	}
}

async function submit(payload: Record<string, unknown>) {
	const effectiveFrom = String(payload.effective_from)
	const rawRate = Number(payload.rate_to_base)
	// If the user entered a market rate > 1 (e.g. 13200 or 14550 SYP per USD),
	// automatically compute the reciprocal rate_to_base required by the backend.
	const rateToBase = rawRate > 1 ? Number((1 / rawRate).toFixed(10)) : rawRate

	const submitPayload: Record<string, unknown> = {
		...payload,
		rate_to_base: rateToBase,
		effective_from: effectiveFrom.includes("T") ? effectiveFrom : `${effectiveFrom}T00:00:00Z`
	}

	if (form.value.suggestion_id) {
		submitPayload.suggestion_id = form.value.suggestion_id
	}

	await mutations.create(submitPayload as unknown as ExchangeRatePayload)
	await fetchSuggestion()
}
</script>
