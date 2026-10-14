<!-- src/add-os/modules/dashboard/components/ReceivablesAging.vue -->
<!--
	Overdue receivables, one card per currency: the total, how much of it is
	older than 30 days, a newest-to-oldest bar, then each age band — its
	amount and share, the largest marked — and a sentence on what the
	spread means. Amounts never cross currencies.
-->
<template>
	<div class="flex flex-col gap-4">
		<div class="flex flex-wrap items-end justify-between gap-3">
			<div class="flex flex-col gap-1">
				<h3 class="text-lg font-bold text-[var(--add-text-primary)]">{{ t("dashboard.aging.title") }}</h3>
				<p class="text-sm text-[var(--add-text-muted)]">{{ t("dashboard.aging.subtitle") }}</p>
			</div>
			<div class="flex items-center gap-4 text-xs text-[var(--add-text-secondary)]">
				<span v-for="band in BANDS" :key="band.key" class="inline-flex items-center gap-1.5">
					<span class="h-2.5 w-2.5 rounded-sm" :class="TONE_FILL[band.tone]" />
					{{ t(`dashboard.aging.tone.${band.tone}`) }}
				</span>
			</div>
		</div>

		<DashCard v-if="cards.length === 0">
			<div class="flex items-center gap-2 text-sm text-[var(--add-success-text)]">
				<Icon name="carbon:checkmark-filled" :size="18" />
				{{ t("dashboard.aging.none") }}
			</div>
		</DashCard>

		<div v-else class="grid grid-cols-1 gap-5 xl:grid-cols-2">
			<DashCard
				v-for="card in cards"
				:key="card.currency"
				:mark="currencySymbol(card.currency)"
				:eyebrow="t('dashboard.aging.eyebrow')"
				:title="currencyName(card.currency)"
				:code="card.currency"
			>
				<div class="flex flex-wrap items-end justify-between gap-4">
					<div class="flex flex-col gap-1">
						<span class="text-sm text-[var(--add-text-secondary)]">{{ t("dashboard.aging.totalOverdue") }}</span>
						<MoneyFigure :amount="card.total" :currency="card.currency" size="xl" />
					</div>
					<div class="flex min-w-40 flex-col items-end gap-0.5 rounded-xl border px-4 py-2.5" :class="TONE_PANEL[card.olderTone]">
						<span class="text-xs text-[var(--add-text-secondary)]">{{ t("dashboard.aging.olderThan30") }}</span>
						<span class="text-2xl font-bold" :class="TONE_TEXT[card.olderTone]">{{ percent(card.olderShare) }}</span>
						<span class="text-xs text-[var(--add-text-muted)]">{{ money(card.older, card.currency) }}</span>
					</div>
				</div>

				<div class="flex flex-col gap-1.5">
					<div class="flex justify-between text-xs text-[var(--add-text-muted)]">
						<span>{{ t("dashboard.aging.newest") }}</span>
						<span>{{ t("dashboard.aging.oldest") }}</span>
					</div>
					<SegmentBar
						:parts="card.bands.map(band => ({ value: band.share, tone: band.tone }))"
						:label="t('dashboard.aging.barLabel')"
					/>
				</div>

				<ul class="m-0 flex list-none flex-col gap-1 p-0">
					<li
						v-for="band in card.bands"
						:key="band.key"
						class="flex items-center justify-between gap-3 rounded-xl border px-3 py-3"
						:class="band.key === card.largest ? TONE_PANEL[band.tone] : 'border-transparent'"
					>
						<div class="flex items-start gap-2.5">
							<span class="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-sm" :class="TONE_FILL[band.tone]" />
							<div class="flex flex-col gap-0.5">
								<span class="flex items-center gap-2 text-sm font-bold text-[var(--add-text-primary)]">
									{{ t(`dashboard.aging.band.${band.key}`) }}
									<span
										v-if="band.key === card.largest"
										class="rounded-full border border-current px-2 py-px text-xs font-medium"
										:class="TONE_TEXT[band.tone]"
									>{{ t("dashboard.aging.largestShare") }}</span>
								</span>
								<span class="inline-flex items-center gap-1 text-xs" :class="band.tone === 'danger' ? TONE_TEXT.danger : 'text-[var(--add-text-muted)]'">
									<Icon v-if="band.tone === 'danger'" name="carbon:warning-alt" :size="12" />
									{{ t(`dashboard.aging.tone.${band.tone}`) }} · {{ t(`dashboard.aging.advice.${band.key}`) }}
								</span>
							</div>
						</div>
						<div class="flex items-center gap-6">
							<MoneyFigure :amount="band.amount" :currency="card.currency" />
							<span class="w-14 text-end text-sm font-bold" :class="TONE_TEXT[band.tone]">{{ percent(band.share) }}</span>
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
import type { DebtAging } from "@/add-os/services/reports"
import { NButton } from "naive-ui"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { RouterLink } from "vue-router"
import DashCard from "@/add-os/modules/dashboard/components/DashCard.vue"
import MoneyFigure from "@/add-os/modules/dashboard/components/MoneyFigure.vue"
import SegmentBar from "@/add-os/modules/dashboard/components/SegmentBar.vue"
import { addAmounts } from "@/add-os/modules/dashboard/config/money"
import { sharePercent } from "@/add-os/modules/dashboard/config/percent"
import { shareTone, TONE_FILL, TONE_PANEL, TONE_TEXT } from "@/add-os/modules/dashboard/config/tones"
import { formatReportMoney } from "@/add-os/services/reports"
import { currencySymbol } from "@/add-os/utils/format/currency"
import Icon from "@/components/common/Icon.vue"

type BandKey = "0_30" | "31_60" | "60_plus"

const props = withDefaults(defineProps<{
	aging: DebtAging[]
	/** The screen listing the invoices behind these figures; none hides the button. */
	detailsTo?: string | null
}>(), {
	detailsTo: "/payments/invoices"
})

const BANDS: Array<{ key: BandKey; tone: Tone }> = [
	{ key: "0_30", tone: "success" },
	{ key: "31_60", tone: "warning" },
	{ key: "60_plus", tone: "danger" }
]

const { t, te } = useI18n()

const cards = computed(() => props.aging.map(row => {
	const total = addAmounts(BANDS.map(band => row[band.key]))
	const whole = Number.parseFloat(total)
	const share = (amount: string) => (whole > 0 ? (Number.parseFloat(amount) / whole) * 100 : 0)
	const bands = BANDS.map(band => ({ ...band, amount: row[band.key], share: share(row[band.key]) }))
	const older = addAmounts([row["31_60"], row["60_plus"]])
	const olderShare = share(older)
	const largest = bands.reduce((top, band) => (band.share > top.share ? band : top), bands[0]).key

	return { currency: row.currency, total, bands, older, olderShare, olderTone: shareTone(olderShare), largest }
}).filter(card => Number.parseFloat(card.total) > 0))

type Card = (typeof cards.value)[number]

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

/** One sentence on the spread, led by whichever band holds the most. */
function insight(card: Card): string {
	const [, , critical] = card.bands
	const largest = card.bands.find(b => b.key === card.largest) ?? critical
	return t(`dashboard.aging.insight.${card.largest}`, {
		share: percent(largest.share),
		critical: money(critical.amount, card.currency),
		criticalShare: percent(critical.share)
	})
}
</script>
