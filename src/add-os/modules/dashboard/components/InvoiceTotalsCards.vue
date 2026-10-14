<!-- src/add-os/modules/dashboard/components/InvoiceTotalsCards.vue -->
<!--
	Invoice totals, one card per currency: what was billed, how much of it was
	collected, then where the rest stands — paid, not yet due, overdue — as a
	bar and as rows with their shares, and a sentence on what needs doing.
	Amounts never cross currencies; overdue is part of what remains.
-->
<template>
	<div class="flex flex-col gap-4">
		<div class="flex flex-wrap items-end justify-between gap-3">
			<div class="flex flex-col gap-1">
				<h3 class="m-0 text-lg font-bold text-[var(--add-text-primary)]">{{ title ?? t("dashboard.totals.title") }}</h3>
				<p class="m-0 text-sm text-[var(--add-text-muted)]">{{ t("dashboard.totals.subtitle") }}</p>
			</div>
			<div class="flex items-center gap-4 text-xs text-[var(--add-text-secondary)]">
				<span v-for="part in PARTS" :key="part.key" class="inline-flex items-center gap-1.5">
					<span class="h-2.5 w-2.5 rounded-sm" :class="TONE_FILL[part.tone]" />
					{{ t(`dashboard.totals.part.${part.key}`) }}
				</span>
			</div>
		</div>

		<DashCard v-if="cards.length === 0">
			<span class="text-sm text-[var(--add-text-secondary)]">{{ t("dashboard.totals.none") }}</span>
		</DashCard>

		<div v-else class="grid grid-cols-1 gap-5 xl:grid-cols-2">
			<DashCard
				v-for="card in cards"
				:key="card.currency"
				:mark="currencySymbol(card.currency)"
				:eyebrow="t('dashboard.totals.eyebrow')"
				:title="currencyName(card.currency)"
				:code="card.currency"
			>
				<template #actions>
					<span
						class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
						:class="card.state === 'overdue' ? 'border-[var(--add-danger)]/50 text-[var(--add-danger-text)]' : 'border-[var(--add-success)]/50 text-[var(--add-success-text)]'"
					>
						<Icon :name="card.state === 'overdue' ? 'carbon:warning-alt' : 'carbon:checkmark-filled'" :size="13" />
						{{ t(`dashboard.totals.state.${card.state}`) }}
					</span>
				</template>

				<div class="flex flex-wrap items-end justify-between gap-4">
					<div class="flex flex-col gap-1">
						<span class="text-sm text-[var(--add-text-secondary)]">{{ t("dashboard.totals.billed") }}</span>
						<MoneyFigure :amount="card.billed" :currency="card.currency" size="xl" />
					</div>
					<div class="flex min-w-40 flex-col items-end gap-0.5 rounded-xl border px-4 py-2.5" :class="TONE_PANEL[card.rateTone]">
						<span class="text-xs text-[var(--add-text-secondary)]">{{ t("dashboard.totals.collectionRate") }}</span>
						<span class="text-2xl font-bold" :class="TONE_TEXT[card.rateTone]" dir="ltr">{{ percent(card.rate) }}</span>
						<span class="text-xs text-[var(--add-text-muted)]">{{ money(card.paid, card.currency) }}</span>
					</div>
				</div>

				<SegmentBar
					:parts="card.parts.map(part => ({ value: part.share, tone: part.tone }))"
					:label="t('dashboard.totals.barLabel')"
				/>

				<ul class="m-0 flex list-none flex-col gap-1 p-0">
					<li
						v-for="part in card.parts"
						:key="part.key"
						class="flex items-center justify-between gap-3 rounded-xl border px-3 py-3"
						:class="part.key === 'overdue' && part.share > 0 ? TONE_PANEL.danger : 'border-transparent'"
					>
						<div class="flex items-start gap-2.5">
							<span class="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-sm" :class="TONE_FILL[part.tone]" />
							<div class="flex flex-col gap-0.5">
								<span class="text-sm font-bold text-[var(--add-text-primary)]">{{ t(`dashboard.totals.part.${part.key}`) }}</span>
								<span
									class="inline-flex items-center gap-1 text-xs"
									:class="part.key === 'overdue' && part.share > 0 ? TONE_TEXT.danger : 'text-[var(--add-text-muted)]'"
								>
									<Icon v-if="part.key === 'overdue' && part.share > 0" name="carbon:warning-alt" :size="12" />
									{{ t(`dashboard.totals.note.${part.key}`) }}
								</span>
							</div>
						</div>
						<div class="flex items-center gap-6">
							<MoneyFigure :amount="part.amount" :currency="card.currency" />
							<span class="w-14 text-end text-sm font-bold" :class="TONE_TEXT[part.tone]" dir="ltr">{{ percent(part.share) }}</span>
						</div>
					</li>
				</ul>

				<template #footer>
					<p class="m-0 flex max-w-xl items-start gap-2 text-sm text-[var(--add-text-secondary)]">
						<Icon name="carbon:growth" :size="16" class="mt-0.5 shrink-0" />
						{{ insight(card) }}
					</p>
					<RouterLink v-if="detailsTo" :to="detailsTo" class="no-underline">
						<n-button size="small" secondary class="rounded-lg">
							{{ t("dashboard.viewDetails") }}
							<template #icon><Icon name="carbon:arrow-left" :size="14" class="ltr:rotate-180" /></template>
						</n-button>
					</RouterLink>
				</template>
			</DashCard>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { Tone } from "@/add-os/modules/dashboard/config/tones"
import { NButton } from "naive-ui"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { RouterLink } from "vue-router"
import DashCard from "@/add-os/modules/dashboard/components/DashCard.vue"
import MoneyFigure from "@/add-os/modules/dashboard/components/MoneyFigure.vue"
import SegmentBar from "@/add-os/modules/dashboard/components/SegmentBar.vue"
import { addAmounts } from "@/add-os/modules/dashboard/config/money"
import { sharePercent } from "@/add-os/modules/dashboard/config/percent"
import { TONE_FILL, TONE_PANEL, TONE_TEXT } from "@/add-os/modules/dashboard/config/tones"
import { formatReportMoney } from "@/add-os/services/reports"
import { currencySymbol } from "@/add-os/utils/format/currency"
import Icon from "@/components/common/Icon.vue"

interface CurrencyTotals {
	currency: string
	billed: string
	paid: string
	remaining: string
	overdue: string
}

type PartKey = "paid" | "upcoming" | "overdue"

const props = withDefaults(defineProps<{
	totals: CurrencyTotals[]
	/** A heading in place of the default one. */
	title?: string | null
	/** The screen listing the invoices behind these figures; none hides the button. */
	detailsTo?: string | null
}>(), {
	title: null,
	detailsTo: null
})

const PARTS: Array<{ key: PartKey; tone: Tone }> = [
	{ key: "paid", tone: "success" },
	{ key: "upcoming", tone: "info" },
	{ key: "overdue", tone: "danger" }
]

const { t, te } = useI18n()

const cards = computed(() => props.totals.map(row => {
	const billed = Number.parseFloat(row.billed)
	const upcoming = addAmounts([row.remaining, `-${row.overdue}`])
	const share = (amount: string) => (billed > 0 ? (Number.parseFloat(amount) / billed) * 100 : 0)
	const amounts: Record<PartKey, string> = { paid: row.paid, upcoming, overdue: row.overdue }
	const rate = share(row.paid)
	const overdue = Number.parseFloat(row.overdue) > 0
	const remaining = Number.parseFloat(row.remaining) > 0

	return {
		currency: row.currency,
		billed: row.billed,
		paid: row.paid,
		remaining: row.remaining,
		overdue: row.overdue,
		rate,
		rateTone: rateTone(rate),
		state: stateOf(overdue, remaining),
		parts: PARTS.map(part => ({ ...part, amount: amounts[part.key], share: share(amounts[part.key]) }))
	}
}).filter(card => Number.parseFloat(card.billed) > 0))

type Card = (typeof cards.value)[number]

/** Most of it in hand, half of it, or less. */
function rateTone(rate: number): Tone {
	if (rate >= 80) return "success"
	return rate >= 50 ? "warning" : "danger"
}

function stateOf(overdue: boolean, remaining: boolean): "overdue" | "onTrack" | "collected" {
	if (overdue) return "overdue"
	return remaining ? "onTrack" : "collected"
}

function percent(value: number): string {
	return sharePercent(t, value)
}

function money(amount: string, currency: string): string {
	return formatReportMoney(amount, currency)
}

function currencyName(code: string): string {
	const key = `dashboard.currencies.${code}`
	return te(key) ? t(key) : code
}

/** What the card asks of whoever reads it: chase the overdue, or nothing. */
function insight(card: Card): string {
	return t(`dashboard.totals.insight.${card.state}`, {
		rate: percent(card.rate),
		overdue: money(card.overdue, card.currency),
		remaining: money(card.remaining, card.currency)
	})
}
</script>
