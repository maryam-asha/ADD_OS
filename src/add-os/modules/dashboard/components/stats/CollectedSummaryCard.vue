<!-- src/add-os/modules/dashboard/components/stats/CollectedSummaryCard.vue -->
<!--
	Money collected over the period, a line per currency — cash, cards and
	invoice payments together — with how it moved against the period before.
	How it came in is the collections report's.
-->
<template>
	<StatCard :title="t('dashboard.stats.collected')" :is-loading :error :ready @retry="emit('retry')">
		<template #filters>
			<RouterLink to="/reports/collections" class="no-underline">
				<n-button size="small" secondary>
					{{ t("dashboard.stats.collectionsReport") }}
					<template #icon><Icon name="carbon:arrow-left" :size="14" class="ltr:rotate-180" /></template>
				</n-button>
			</RouterLink>
		</template>

		<p v-if="rows.length === 0" class="m-0 text-sm text-[var(--add-text-secondary)]">{{ t("dashboard.finance.nothingCollected") }}</p>
		<ul v-else class="m-0 flex list-none flex-col gap-4 p-0">
			<li v-for="row in rows" :key="row.currency" class="flex items-center justify-between gap-3">
				<span class="flex items-center gap-3">
					<span class="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--add-surface-sunken)] text-sm font-bold text-[var(--add-text-primary)]">
						{{ currencySymbol(row.currency) }}
					</span>
					<MoneyFigure :amount="row.total" :currency="row.currency" size="lg" />
				</span>
				<span class="flex flex-col items-end gap-1 text-xs">
					<span
						v-if="row.change !== null && row.change !== 0"
						class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold"
						:class="row.change > 0 ? 'border-[var(--add-success)]/50 text-[var(--add-success-text)]' : 'border-[var(--add-danger)]/50 text-[var(--add-danger-text)]'"
					>
						<Icon :name="row.change > 0 ? 'carbon:arrow-up' : 'carbon:arrow-down'" :size="12" />
						{{ signedPercent(row.change) }}
					</span>
					<span class="text-[var(--add-text-muted)]">{{ t("dashboard.previousValue", { value: formatReportMoney(row.previous, row.currency) }) }}</span>
				</span>
			</li>
		</ul>
	</StatCard>
</template>

<script setup lang="ts">
import type { FinanceCollected } from "@/add-os/services/dashboard"
import { NButton } from "naive-ui"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { RouterLink } from "vue-router"
import MoneyFigure from "@/add-os/modules/dashboard/components/MoneyFigure.vue"
import StatCard from "@/add-os/modules/dashboard/components/stats/StatCard.vue"
import { ltr } from "@/add-os/modules/dashboard/config/bidi"
import { addAmounts, amountIn, currenciesOf } from "@/add-os/modules/dashboard/config/money"
import { sharePercent } from "@/add-os/modules/dashboard/config/percent"
import { formatReportMoney } from "@/add-os/services/reports"
import { currencySymbol } from "@/add-os/utils/format/currency"
import { formatNumber } from "@/add-os/utils/format/numbers"
import Icon from "@/components/common/Icon.vue"

const props = defineProps<{
	current: FinanceCollected | null
	previous: FinanceCollected | null
	isLoading: boolean
	error: unknown
	ready: boolean
}>()

const emit = defineEmits<{
	(e: "retry"): void
}>()

const { t } = useI18n()

function totalOf(collected: FinanceCollected | null, currency: string) {
  return collected
	? addAmounts([amountIn(collected.cash, currency), amountIn(collected.card, currency), amountIn(collected.invoice_payments, currency)])
	: "0"
}

const rows = computed(() => {
	const { current, previous } = props
	if (!current) return []
	const lists = [current, previous].filter((c): c is FinanceCollected => c !== null).flatMap(c => [c.cash, c.card, c.invoice_payments])

	return currenciesOf(...lists).map(currency => {
		const total = totalOf(current, currency)
		const before = totalOf(previous, currency)
		const was = Number.parseFloat(before)
		return { currency, total, previous: before, change: was > 0 ? ((Number.parseFloat(total) - was) / was) * 100 : null }
	})
})

/** Signed, held left-to-right; past tenfold, a multiple says more than a percentage. */
function signedPercent(value: number): string {
	if (value > 900) return ltr(t("dashboard.times", { value: formatNumber(value / 100 + 1, { fractionDigits: 0 }) }))
	return ltr(`${value > 0 ? "+" : "-"}${sharePercent(t, Math.abs(value))}`)
}
</script>
