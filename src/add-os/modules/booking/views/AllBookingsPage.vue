<!-- src/add-os/modules/booking/views/AllBookingsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.allBookings") }}</h1>
			<p>{{ t("allBookings.description") }}</p>
		</div>

		<n-alert v-if="error" type="error" :title="t('allBookings.loadError')" />

		<n-card>
			<div class="flex flex-wrap items-end gap-4">
				<n-input
					v-model:value="search"
					class="w-64"
					size="small"
					clearable
					:placeholder="t('allBookings.filters.searchPlaceholder')"
				>
					<template #prefix>
						<Icon name="carbon:search" />
					</template>
				</n-input>

				<n-select
					v-model:value="status"
					class="w-44"
					size="small"
					clearable
					:options="statusOptions"
					:placeholder="t('allBookings.filters.anyStatus')"
				/>

				<n-select
					v-model:value="paymentState"
					class="w-44"
					size="small"
					clearable
					:options="paymentStateOptions"
					:placeholder="t('allBookings.filters.anyPaymentState')"
				/>

				<n-date-picker
					v-model:formatted-value="dateRange"
					type="daterange"
					size="small"
					clearable
					value-format="yyyy-MM-dd"
					:start-placeholder="t('allBookings.filters.from')"
					:end-placeholder="t('allBookings.filters.to')"
				/>

				<n-button v-if="hasFilters" size="small" quaternary @click="clearFilters">
					{{ t("allBookings.filters.clear") }}
				</n-button>
			</div>
		</n-card>

		<n-card class="add-ledger-table">
			<n-data-table v-if="rows.length > 0 || isLoading" :columns :data="rows" :loading="isLoading" :bordered="false" :row-key />
			<div v-else-if="!error" class="py-10 text-center">{{ t("allBookings.empty") }}</div>

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

const statusOptions = computed<SelectOption[]>(() =>
	BOOKING_STATUSES.map(value => ({ label: t(`allBookings.status.${value}`), value }))
)

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
