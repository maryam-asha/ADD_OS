<!-- src/add-os/modules/payments/components/ExchangeRateSuggestionBanner.vue -->
<template>
	<n-alert v-if="pending && pending.source_stale" type="warning" :title="t('exchangeRates.suggestion.staleTitle')">
		<div class="flex flex-col gap-3">
			<p>{{ t("exchangeRates.suggestion.staleBody") }}</p>
			<p class="text-secondary text-xs">{{ lastFetchLabel }}</p>
			<div class="flex flex-wrap gap-2">
				<n-button size="small" :loading="dismissing" @click="emit('dismiss')">
					{{ t("exchangeRates.suggestion.dismiss") }}
				</n-button>
			</div>
		</div>
	</n-alert>

	<n-alert v-else-if="pending" type="info" :title="t('exchangeRates.suggestion.title')">
		<div class="flex flex-col gap-3">
			<p class="text-base font-bold">{{ t("exchangeRates.suggestion.headline", { rate: marketRate }) }}</p>

			<div class="flex flex-wrap items-center gap-2">
				<n-tag v-if="deviation" :type="deviation.tone" round size="small">
					{{ t("exchangeRates.suggestion.deviation", { percent: deviation.label }) }}
				</n-tag>
				<span class="text-secondary text-xs" :title="fetchedAtAbsolute">
					{{ t("exchangeRates.suggestion.fetched", { when: fetchedAtRelative, source: pending.source ?? t("exchangeRates.suggestion.unknownSource") }) }}
				</span>
			</div>

			<p class="text-secondary text-xs">{{ t("exchangeRates.suggestion.submits", { rate: submittedRate }) }}</p>

			<div class="flex flex-wrap gap-2">
				<n-button type="primary" size="small" @click="emit('accept', pending)">
					<template #icon><Icon name="carbon:checkmark" :size="16" /></template>
					{{ t("exchangeRates.suggestion.accept") }}
				</n-button>
				<n-button size="small" :loading="dismissing" @click="emit('dismiss')">
					{{ t("exchangeRates.suggestion.dismiss") }}
				</n-button>
			</div>
		</div>
	</n-alert>
</template>

<script setup lang="ts">
import type { ExchangeRateSuggestionResponse, PendingExchangeRateSuggestion } from "@/add-os/modules/payments/types/exchange-rate"
import { NAlert, NButton, NTag } from "naive-ui"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { useNow } from "@/add-os/composables/useNow"
import { DEVIATION_WARNING_THRESHOLD_PERCENT } from "@/add-os/modules/payments/config/exchange-rates.config"
import { hasPendingSuggestion } from "@/add-os/modules/payments/types/exchange-rate"
import { formatDateTime, formatNumber, formatRelativeTime } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

const props = defineProps<{
	suggestion: ExchangeRateSuggestionResponse | null
	dismissing: boolean
}>()

const emit = defineEmits<{
	accept: [suggestion: PendingExchangeRateSuggestion]
	dismiss: []
}>()

const { t } = useI18n()

/** Ages the "fetched 2 hours ago" text while the page stays open, same as ArrivalRequestsPage. */
const now = useNow(60_000)

/**
 * `null` renders nothing at all — not an empty state, not a "no suggestions"
 * card. `id === null` is the endpoint's ordinary answer on most days (the
 * scheduled fetch runs once daily and most quotes get accepted or dismissed the
 * same morning), so a placeholder here would be permanent furniture above a
 * table that does not need it.
 */
const pending = computed<PendingExchangeRateSuggestion | null>(() => (hasPendingSuggestion(props.suggestion) ? props.suggestion : null))

/**
 * The headline figure is `rate_usd_to_syp` — SYP per 1 USD, sp-today's number
 * exactly as quoted, and the only one of the two an admin recognises from
 * outside this system.
 *
 * No `fractionDigits`: `formatNumber`'s default keeps whatever precision the
 * decimal string carried and strips trailing zeros, so "14700.0000000000"
 * reads as "14,700" while a genuinely fractional quote keeps its digits.
 */
const marketRate = computed(() => (pending.value ? formatNumber(pending.value.rate_usd_to_syp) : ""))

/**
 * The other direction, shown as small print rather than as the headline.
 *
 * This is the value that actually gets submitted, taken verbatim from
 * `suggested_rate_to_base` and never recomputed here. Showing it matters
 * precisely because it looks nothing like the headline — an admin who sees
 * "0.0000680272" next to "14,700" can tell at a glance that the inversion
 * happened, which is the failure this whole feature is shaped around.
 */
const submittedRate = computed(() => (pending.value ? formatNumber(pending.value.suggested_rate_to_base) : ""))

/**
 * `null` when nothing is pending or when there is no current effective rate to
 * compare against — in the second case the chip is simply absent, since "0%
 * deviation" would be a claim about a comparison that never happened.
 */
const deviation = computed(() => {
	const percent = pending.value?.deviation_percent
	if (percent === null || percent === undefined) return null

	return {
		/** Signed, so a drop and a rise are distinguishable at a glance. `formatNumber` supplies the minus; the plus is ours. */
		label: `${percent > 0 ? "+" : ""}${formatNumber(percent, { fractionDigits: 2 })}`,
		tone: Math.abs(percent) >= DEVIATION_WARNING_THRESHOLD_PERCENT ? ("warning" as const) : ("default" as const)
	}
})

const fetchedAtRelative = computed(() =>
	pending.value?.fetched_at ? formatRelativeTime(pending.value.fetched_at, { now: now.value }) : t("exchangeRates.suggestion.unknownTime")
)

const fetchedAtAbsolute = computed(() => (pending.value?.fetched_at ? formatDateTime(pending.value.fetched_at) : ""))

const lastFetchLabel = computed(() => {
	const last = props.suggestion?.last_successful_fetch_at
	return last
		? t("exchangeRates.suggestion.lastFetch", { when: formatDateTime(last) })
		: t("exchangeRates.suggestion.neverFetched")
})

/**
 * Why the stale branch offers Dismiss but not Accept.
 *
 * `source_stale` means nothing has been fetched in 48h, so the pending row's
 * figure is a stale quote — and the whole point of replacing the banner is not
 * presenting it as current. Accepting it would write exactly that stale number
 * into the live rate table under `source = external_accepted`, which is the
 * outcome the flag exists to prevent. Dismiss stays, because the row is still
 * pending and an admin still needs a way to clear it; nothing about clearing it
 * depends on the figure being fresh.
 */
defineExpose({ pending, deviation, marketRate, submittedRate })
</script>
