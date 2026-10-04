<!-- src/add-os/modules/booking/views/AllBookingsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<!-- Header: title on the start side, live result count on the end side -->
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.allBookings") }}</h1>
				<p class="add-bookings__lede">{{ t("allBookings.description") }}</p>
			</div>

			<!-- The count answers "how many match what I just typed", so it is
			     part of the filter feedback loop, not decoration. -->
			<div v-if="meta && !error" class="add-bookings__count">
				<span class="add-bookings__count-value">{{ formatNumber(meta.total) }}</span>
				<span class="add-bookings__count-label">{{ t("allBookings.resultCount") }}</span>
			</div>
		</div>

		<n-alert v-if="error" type="error" :title="t('allBookings.loadError')" />

		<section class="add-bookings__filters" :aria-label="t('allBookings.filters.legend')">
			<!-- Row 1 — status chips. Status is the filter an operator reaches
			     for most, and chips keep every option and the current one
			     visible at once; a closed dropdown shows neither. -->
			<div class="add-bookings__chips" role="group" :aria-label="t('allBookings.filters.status')">
				<button
					v-for="option in statusChips"
					:key="option.value ?? 'all'"
					type="button"
					class="add-chip"
					:class="{ 'add-chip--active': status === option.value }"
					:aria-pressed="status === option.value"
					@click="status = option.value"
				>
					{{ option.label }}
				</button>
			</div>

			<div class="add-bookings__divider" />

			<!-- Row 2 — the rest. Each control keeps a visible label: a
			     placeholder disappears the moment a value is picked, which
			     leaves a filtered list with nothing saying what filtered it. -->
			<div class="add-bookings__fields">
				<label class="add-field add-field--grow">
					<span class="add-field__label">{{ t("allBookings.filters.search") }}</span>
					<n-input
						v-model:value="search"
						clearable
						:placeholder="t('allBookings.filters.searchPlaceholder')"
					>
						<template #prefix>
							<Icon name="carbon:search" :size="16" />
						</template>
					</n-input>
				</label>

				<label class="add-field">
					<span class="add-field__label">{{ t("allBookings.filters.paymentState") }}</span>
					<n-select
						v-model:value="paymentState"
						clearable
						:options="paymentStateOptions"
						:placeholder="t('allBookings.filters.anyPaymentState')"
					/>
				</label>

				<label class="add-field add-field--range">
					<span class="add-field__label">{{ t("allBookings.filters.dateRange") }}</span>
					<n-date-picker
						v-model:formatted-value="dateRange"
						type="daterange"
						clearable
						value-format="yyyy-MM-dd"
						:start-placeholder="t('allBookings.filters.from')"
						:end-placeholder="t('allBookings.filters.to')"
					/>
				</label>
			</div>

			<!-- Its own row on the start side, as on the calendar: inline with the
			     fields it jumped between lines as they wrapped. `justify-start` is
			     logical, so it sits right in Arabic and left in English. -->
			<div v-if="hasFilters" class="add-bookings__reset-row">
				<n-button quaternary size="small" class="add-bookings__clear" @click="clearFilters">
					<template #icon><Icon name="carbon:filter-reset" :size="16" /></template>
					{{ t("allBookings.filters.clear") }}
				</n-button>
			</div>
		</section>

		<n-card class="add-ledger-table">
			<n-data-table v-if="rows.length > 0 || isLoading" :columns :data="rows" :loading="isLoading" :bordered="false" :row-key />

			<!-- An empty result and an empty district are different facts, and an
			     operator who filtered their way into nothing needs the way out,
			     not just the news. -->
			<div v-else-if="!error" class="add-bookings__empty">
				<Icon name="carbon:calendar" :size="32" />
				<p class="add-bookings__empty-title">{{ t("allBookings.empty") }}</p>
				<n-button v-if="hasFilters" size="small" secondary @click="clearFilters">
					{{ t("allBookings.filters.clear") }}
				</n-button>
			</div>

			<div v-if="meta && meta.last_page > 1" class="mt-4 flex justify-end">
				<n-pagination v-model:page="page" :page-count="meta.last_page" :disabled="isLoading" />
			</div>
		</n-card>
	</div>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { AdminBooking, BookingPaymentState, BookingStatus } from "@/add-os/modules/booking/types/calendar"
import { NAlert, NButton, NCard, NDataTable, NDatePicker, NInput, NPagination, NSelect } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { buildAllBookingsColumns } from "@/add-os/modules/booking/config/all-bookings.config"
import { BOOKING_PAYMENT_STATES, BOOKING_STATUSES } from "@/add-os/modules/booking/types/calendar"
import { listBookings } from "@/add-os/services/booking-calendar"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * Every booking in the district, filterable.
 *
 * Read-only for the same reason the calendar is: approve, reject, cancel and
 * settle all live on the reception screens, and putting a second copy of those
 * buttons here would mean two places to keep the rules straight.
 *
 * Filtering is server-side, not a client filter over a fetched page. A client
 * filter would search only the 25 rows currently loaded and silently report
 * "no bookings match" while the match sat on page three.
 *
 * The date range filters on the booking's own `start_at` — an operator asking
 * what is booked next week means the booking's dates, not when it was made.
 *
 * ── Layout ──────────────────────────────────────────────────────────────────
 *
 * Status is a chip row rather than a fourth dropdown. It is the filter used
 * most, it has four values and an "all", and chips show every option plus the
 * active one without being opened — the precedent is `OperationsRequestsPage`.
 * The remaining filters stay as fields because their value sets are either
 * open (search, dates) or rarely touched (payment state).
 *
 * Every field carries a visible label. These shipped placeholder-only, which
 * in RTL rendered as a row of blank pills saying nothing about what they
 * filtered, and a placeholder is gone precisely when a filter is active —
 * exactly when the label is needed.
 *
 * The count next to the title is `meta.total`, which is the count for the
 * CURRENT filter. Per-status counts are deliberately absent: this endpoint
 * returns one total, so a tally on each chip would take four extra requests
 * per keystroke, and guessing them from the loaded page would count 25 rows
 * and call it the district.
 */

defineProps<{ titleKey?: string }>()

const { t } = useI18n()

const page = ref(1)
const search = ref<string | null>(null)
const status = ref<BookingStatus | null>(null)
const paymentState = ref<BookingPaymentState | null>(null)
const dateRange = ref<[string, string] | null>(null)

const query = computed<Record<string, unknown>>(() => ({
	...(search.value ? { q: search.value } : {}),
	...(status.value ? { status: status.value } : {}),
	...(paymentState.value ? { payment_state: paymentState.value } : {}),
	...(dateRange.value ? { from: dateRange.value[0], to: dateRange.value[1] } : {})
}))

const hasFilters = computed(() => Object.keys(query.value).length > 0)

const { data: rows, isLoading, error, meta } = useResourceList<AdminBooking>(listBookings, query, page)

// Any filter change invalidates the current page number: page 3 of an
// unfiltered list is rarely page 3 of a filtered one, and leaving it would
// show an empty table for a filter that has results.
watch(query, () => {
	page.value = 1
})

const columns = computed(() => buildAllBookingsColumns(t))

/** The chip row: "All" first, then one per status, in the enum's own order. */
const statusChips = computed<{ value: BookingStatus | null, label: string }[]>(() => [
	{ value: null, label: t("allBookings.filters.anyStatus") },
	...BOOKING_STATUSES.map(value => ({ value, label: t(`allBookings.status.${value}`) }))
])

const paymentStateOptions = computed<SelectOption[]>(() =>
	BOOKING_PAYMENT_STATES.map(value => ({ label: t(`allBookings.paymentState.${value}`), value }))
)

function rowKey(row: AdminBooking) {
	return row.id
}

function clearFilters(): void {
	search.value = null
	status.value = null
	paymentState.value = null
	dateRange.value = null
}
</script>

<style scoped lang="scss">
// Every value below is a design token. Invariant: no hardcoded design values
// anywhere under src/add-os/ — see theme/tokens.ts, the single source.

.add-bookings {
	&__lede {
		color: var(--add-text-secondary);
	}

	// Total for the active filter, weighted so it reads at a glance without
	// competing with the page title.
	&__count {
		display: flex;
		align-items: baseline;
		gap: var(--add-space-2);
	}

	&__count-value {
		font-family: var(--add-font-family-numeric);
		font-size: var(--add-font-size-h3);
		font-weight: var(--add-font-weight-bold);
		color: var(--add-text-primary);
		line-height: 1;
	}

	&__count-label {
		font-size: var(--add-font-size-caption);
		color: var(--add-text-muted);
	}

	&__filters {
		display: flex;
		flex-direction: column;
		gap: var(--add-space-5);
		padding: var(--add-space-5) var(--add-space-6);
		background: var(--add-surface);
		border: var(--add-border-width-hairline) solid var(--add-border);
		border-radius: var(--add-radius-large);
	}

	&__chips {
		display: flex;
		flex-wrap: wrap;
		gap: var(--add-space-3);
	}

	&__divider {
		height: var(--add-border-width-hairline);
		background: var(--add-border);
	}

	&__fields {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: var(--add-space-5);
	}

	&__reset-row {
		display: flex;
		justify-content: flex-start;
	}

	&__clear {
		font-size: var(--add-font-size-caption);
		font-weight: var(--add-font-weight-medium);
		color: var(--add-text-secondary);

		&:hover {
			color: var(--add-primary);
		}
	}

	&__empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--add-space-5);
		padding-block: var(--add-space-10);
		color: var(--add-text-muted);
	}

	&__empty-title {
		font-size: var(--add-font-size-body);
		color: var(--add-text-secondary);
		margin: var(--add-space-0);
	}
}

.add-field {
	display: flex;
	flex-direction: column;
	gap: var(--add-space-2);
	min-width: 11rem;

	&--grow {
		flex: 1 1 16rem;
	}

	// The range picker needs room for two dates and a separator; below this it
	// wraps its own contents and the control loses its shape.
	&--range {
		min-width: 17rem;
	}

	&__label {
		font-size: var(--add-font-size-caption);
		font-weight: var(--add-font-weight-medium);
		color: var(--add-text-secondary);
	}
}

.add-chip {
	padding: var(--add-space-3) var(--add-space-6);
	border-radius: var(--add-radius-pill);
	border: var(--add-border-width-hairline) solid var(--add-border);
	background: var(--add-surface-raised);
	color: var(--add-text-secondary);
	font-size: var(--add-font-size-caption);
	font-weight: var(--add-font-weight-medium);
	cursor: pointer;
	transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;

	&:hover:not(.add-chip--active) {
		background: var(--add-surface-sunken);
		color: var(--add-text-primary);
	}

	// Two-layer ring, so the focus state survives on both the raised chip and
	// the sunken filter panel behind it.
	&:focus-visible {
		outline: var(--add-border-width-emphasis) solid var(--add-focus-ring-inner);
		outline-offset: var(--add-space-1);
	}

	// The active chip carries fill AND weight, not fill alone: at this palette's
	// contrast, colour by itself is the only signal a deuteranopic viewer loses.
	&--active {
		background: var(--add-primary);
		border-color: var(--add-primary);
		color: var(--add-primary-on);
		font-weight: var(--add-font-weight-bold);
	}
}
</style>
