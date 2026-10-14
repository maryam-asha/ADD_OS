<!-- src/add-os/modules/dashboard/components/CollectedCards.vue -->
<!--
	Money collected over the period, one card per currency: the total against
	the period before, then how it came in — cash, cards, invoice payments —
	each with its share, and what was invoiced. Never added across currencies.
-->
<template>
	<DashCard v-if="cards.length === 0">
		<span class="text-sm text-[var(--add-text-secondary)]">{{ t("dashboard.finance.nothingCollected") }}</span>
	</DashCard>

	<div v-else class="grid grid-cols-1 gap-5 xl:grid-cols-2">
		<DashCard
			v-for="card in cards"
			:key="card.currency"
			:mark="currencySymbol(card.currency)"
			:eyebrow="t('dashboard.finance.collected')"
			:title="currencyName(card.currency)"
			:code="card.currency"
		>
			<div class="flex flex-wrap items-end justify-between gap-3">
				<MoneyFigure :amount="card.total" :currency="card.currency" size="xl" />
				<div class="flex flex-col items-end gap-1 text-xs">
					<span
						v-if="card.change !== null && card.change !== 0"
						class="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-semibold"
						:class="card.change > 0 ? 'border-[var(--add-success)] text-[var(--add-success-text)]' : 'border-[var(--add-danger)] text-[var(--add-danger-text)]'"
					>
						<Icon :name="card.change > 0 ? 'carbon:arrow-up' : 'carbon:arrow-down'" :size="12" />
						{{ signedPercent(card.change) }}
					</span>
					<span class="text-[var(--add-text-muted)]">{{ t("dashboard.previousValue", { value: money(card.previous, card.currency) }) }}</span>
				</div>
			</div>

			<ul class="m-0 flex list-none flex-col gap-3 p-0">
				<li v-for="channel in card.channels" :key="channel.key" class="flex flex-col gap-1.5">
					<div class="flex items-center justify-between gap-3 text-sm">
						<span class="text-[var(--add-text-primary)]">{{ t(`dashboard.finance.${channel.key}`) }}</span>
						<span class="flex items-center gap-4">
							<MoneyFigure :amount="channel.amount" :currency="card.currency" />
							<span class="w-12 text-end text-xs font-semibold text-[var(--add-text-secondary)]">{{ percent(channel.share) }}</span>
						</span>
					</div>
					<div class="h-1.5 w-full overflow-hidden rounded-full bg-[var(--add-surface-sunken)]">
						<div class="h-full rounded-full bg-[var(--add-primary)]" :style="{ width: `${channel.share}%` }" />
					</div>
				</li>
			</ul>

			<template #footer>
				<span class="text-sm text-[var(--add-text-secondary)]">{{ t("dashboard.finance.invoiced") }}</span>
				<span class="flex flex-col items-end">
					<MoneyFigure :amount="card.invoiced" :currency="card.currency" />
					<span class="text-xs text-[var(--add-text-muted)]">{{ t("dashboard.previousValue", { value: money(card.invoicedBefore, card.currency) }) }}</span>
				</span>
			</template>
		</DashCard>
	</div>
</template>

<script setup lang="ts">
import type { FinanceCollected } from "@/add-os/services/dashboard"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import DashCard from "@/add-os/modules/dashboard/components/DashCard.vue"
import MoneyFigure from "@/add-os/modules/dashboard/components/MoneyFigure.vue"
import { ltr } from "@/add-os/modules/dashboard/config/bidi"
import { addAmounts, amountIn, currenciesOf } from "@/add-os/modules/dashboard/config/money"
import { sharePercent } from "@/add-os/modules/dashboard/config/percent"
import { formatReportMoney } from "@/add-os/services/reports"
import { currencySymbol } from "@/add-os/utils/format/currency"
import { formatNumber } from "@/add-os/utils/format/numbers"
import Icon from "@/components/common/Icon.vue"

const props = defineProps<{
	current: FinanceCollected
	previous: FinanceCollected
}>()

const { t, te } = useI18n()

const CHANNELS = [
	{ key: "cash", list: "cash" },
	{ key: "card", list: "card" },
	{ key: "invoicePayments", list: "invoice_payments" }
] as const

const cards = computed(() => {
	const { current, previous } = props
	const totalOf = (collected: FinanceCollected, currency: string) =>
		addAmounts(CHANNELS.map(channel => amountIn(collected[channel.list], currency)))

	return currenciesOf(current.cash, current.card, current.invoice_payments, current.invoiced, previous.cash, previous.card, previous.invoice_payments)
		.map(currency => {
			const total = totalOf(current, currency)
			const before = totalOf(previous, currency)
			const whole = Number.parseFloat(total)
			const was = Number.parseFloat(before)

			return {
				currency,
				total,
				previous: before,
				change: was > 0 ? ((whole - was) / was) * 100 : null,
				channels: CHANNELS.map(channel => {
					const amount = amountIn(current[channel.list], currency) ?? "0"
					return { key: channel.key, amount, share: whole > 0 ? (Number.parseFloat(amount) / whole) * 100 : 0 }
				}),
				invoiced: amountIn(current.invoiced, currency) ?? "0",
				invoicedBefore: amountIn(previous.invoiced, currency) ?? "0"
			}
		})
})

function percent(value: number): string {
	return sharePercent(t, value)
}

/**
 * The move as a signed percentage — or, past tenfold, as a multiple: "+71,304%"
 * over a period that took almost nothing says less than "×714".
 */
function signedPercent(value: number): string {
	if (value > 900) return ltr(t("dashboard.times", { value: formatNumber(value / 100 + 1, { fractionDigits: 0 }) }))
	return ltr(`${value > 0 ? "+" : "-"}${percent(Math.abs(value))}`)
}

function money(amount: string, currency: string): string {
	return formatReportMoney(amount, currency)
}

function currencyName(code: string): string {
	const key = `dashboard.currencies.${code}`
	return te(key) ? t(key) : code
}
</script>
