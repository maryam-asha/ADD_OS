<!-- src/add-os/modules/booking/views/ArrivalsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.arrivals") }}</h1>
				<p>{{ t("arrivals.description") }}</p>
			</div>
			<n-button :loading="isLoading" @click="refetchAll">
				<template #icon><Icon name="carbon:renew" :size="16" /></template>
				{{ t("activeSessions.refresh") }}
			</n-button>
		</div>

		<!-- Members who pressed "I have arrived" in the app -->
		<n-card class="add-ledger-table" :title="t('arrivals.requests.title')">
			<n-alert v-if="requestsError" type="error" :title="t('arrivals.loadError')" />
			<n-data-table v-else-if="requests.length > 0 || requestsLoading" :columns="requestColumns" :data="requests" :loading="requestsLoading" :bordered="false" :row-key="byId" size="small" :scroll-x="820" />
			<div v-else class="py-8 text-center">{{ t("arrivals.requests.empty") }}</div>
		</n-card>

		<!-- Today's confirmed bookings nobody has checked in yet -->
		<n-card class="add-ledger-table" :title="t('arrivals.expected.title')">
			<n-alert v-if="bookingsError" type="error" :title="t('arrivals.loadError')" />
			<n-data-table v-else-if="expected.length > 0 || bookingsLoading" :columns="bookingColumns" :data="expected" :loading="bookingsLoading" :bordered="false" :row-key="byId" size="small" :scroll-x="820" />
			<div v-else class="py-8 text-center">{{ t("arrivals.expected.empty") }}</div>
		</n-card>

		<n-modal v-model:show="spaceModalVisible" preset="card" :title="t('arrivals.requests.walkInTitle')" class="max-w-md">
			<p class="mb-3 text-sm">{{ t("arrivals.requests.walkInBody") }}</p>
			<n-select v-model:value="walkInSpaceId" :options="coSpaceOptions" :loading="spacesLoading" :placeholder="t('arrivals.requests.spacePlaceholder')" />
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="spaceModalVisible = false">{{ t("resourceCrud.form.cancel") }}</n-button>
					<n-button type="primary" :disabled="walkInSpaceId === null" :loading="action.isSubmitting.value" @click="confirmWalkIn">
						{{ t("arrivals.requests.confirm") }}
					</n-button>
				</div>
			</template>
		</n-modal>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { AdminBooking } from "@/add-os/modules/booking/types/calendar"
import type { ArrivalRequest } from "@/add-os/modules/booking/types/reception"
import type { Space } from "@/add-os/modules/spatial/types/space"
import { NAlert, NButton, NCard, NDataTable, NModal, NSelect, NTag } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { useReceptionAction } from "@/add-os/modules/booking/composables/useReceptionAction"
import { ApiError } from "@/add-os/services/api"
import { listBookings } from "@/add-os/services/booking-calendar"
import { checkInBooking, confirmArrivalRequest, listArrivalRequests, rejectArrivalRequest } from "@/add-os/services/reception"
import { listSpaces } from "@/add-os/services/spaces"
import { formatTime } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * Where a member's arrival is turned into a session when nothing did it for
 * them. A booked room usually starts itself — the member opening its door
 * with the QR, or the desk activating the door code, checks it in — but a
 * door opened by keypad tells the server nothing, and a room may have no lock.
 * So: today's bookings still waiting for their member, each with a check-in,
 * and the members who pressed "I have arrived" in the app.
 *
 * Check-in goes through the same endpoint and rules as everywhere else (no
 * earlier than 15 minutes before the start, within business hours, approved
 * and paid-for); the button is greyed until the window opens, and any other
 * refusal comes back as the server's own message.
 */

defineProps<{ titleKey?: string }>()

const { t } = useI18n()

/** How early a booking may be checked in — BookingCheckInService::EARLY_CHECK_IN_MINUTES. */
const EARLY_CHECK_IN_MINUTES = 15

const requests = ref<ArrivalRequest[]>([])
const requestsLoading = ref(false)
const requestsError = ref(false)

const bookings = ref<AdminBooking[]>([])
const bookingsLoading = ref(false)
const bookingsError = ref(false)

const isLoading = computed(() => requestsLoading.value || bookingsLoading.value)

function byId(row: { id: number }): number {
	return row.id
}

/** `YYYY-MM-DD` of a date in this browser's own calendar. */
function localDate(date: Date): string {
	const pad = (n: number) => String(n).padStart(2, "0")
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

async function loadRequests(): Promise<void> {
	requestsLoading.value = true
	requestsError.value = false
	try {
		requests.value = (await listArrivalRequests()).data
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		requestsError.value = true
	} finally {
		requestsLoading.value = false
	}
}

/**
 * The server filters `from`/`to` on the UTC date of `start_at`, so a booking
 * just after local midnight sits on the previous UTC day: ask from yesterday
 * and keep today's here, in local time.
 */
async function loadBookings(): Promise<void> {
	bookingsLoading.value = true
	bookingsError.value = false
	try {
		const now = new Date()
		const yesterday = new Date(now)
		yesterday.setDate(now.getDate() - 1)
		const page = await listBookings({ status: "confirmed", from: localDate(yesterday), to: localDate(now), per_page: 100 })
		bookings.value = page.data
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		bookingsError.value = true
	} finally {
		bookingsLoading.value = false
	}
}

const now = ref(Date.now())

async function refetchAll(): Promise<void> {
	now.value = Date.now()
	await Promise.all([loadRequests(), loadBookings()])
}

onMounted(refetchAll)

const action = useReceptionAction(refetchAll)

/** Today's, not yet checked in, not yet over — soonest first. */
const expected = computed(() => {
	const today = localDate(new Date(now.value))
	return bookings.value
		.filter(b => b.checked_in_at === null && new Date(b.end_at).getTime() > now.value && localDate(new Date(b.start_at)) === today)
		.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
})

/** When check-in opens for this booking, or null once it has. */
function opensAt(booking: AdminBooking): Date | null {
	const opens = new Date(new Date(booking.start_at).getTime() - EARLY_CHECK_IN_MINUTES * 60_000)
	return opens.getTime() > now.value ? opens : null
}

async function checkIn(booking: AdminBooking): Promise<void> {
	await action.run(() => checkInBooking(booking.id), t("arrivals.expected.checkedIn"))
}

const bookingColumns = computed<DataTableColumns<AdminBooking>>(() => [
	{ title: t("arrivals.columns.member"), key: "member", minWidth: 160, render: row => row.member.name ?? "—" },
	{ title: t("arrivals.columns.space"), key: "space", minWidth: 140, render: row => row.space.title ?? "—" },
	{
		title: t("arrivals.columns.time"),
		key: "start_at",
		minWidth: 140,
		render: row => h("bdi", { dir: "ltr", class: "font-mono text-xs" }, `${formatTime(row.start_at)} – ${formatTime(row.end_at)}`)
	},
	{
		title: t("arrivals.columns.payment"),
		key: "payment_state",
		width: 120,
		render: row => h(NTag, { size: "small", round: true, type: row.payment_state === "paid" ? "success" : "warning" }, { default: () => t(`allBookings.paymentState.${row.payment_state}`) })
	},
	{
		title: t("activeSessions.columns.actions"),
		key: "actions",
		minWidth: 180,
		align: "center",
		render: (row) => {
			const opens = opensAt(row)
			return h(
				NButton,
				{ size: "small", type: "primary", disabled: opens !== null, title: opens ? t("arrivals.expected.opensAt", { time: formatTime(opens) }) : undefined, onClick: () => checkIn(row) },
				{ icon: () => h(Icon, { name: "carbon:login", size: 16 }), default: () => opens ? t("arrivals.expected.opensAt", { time: formatTime(opens) }) : t("arrivals.expected.checkIn") }
			)
		}
	}
])

/* ── Arrival requests ─────────────────────────────────────────────────────── */

const spaces = ref<Space[]>([])
const spacesLoading = ref(false)
const spaceModalVisible = ref(false)
const walkInTarget = ref<ArrivalRequest | null>(null)
const walkInSpaceId = ref<number | null>(null)

const coSpaceOptions = computed<SelectOption[]>(() =>
	spaces.value
		.filter(s => s.space_type === "co_space" && s.status === "active")
		.map(s => ({ label: (s.name ? pickLocalized(s.name, currentLocale.value) : "") || `#${s.id}`, value: s.id }))
)

async function confirm(request: ArrivalRequest): Promise<void> {
	if (request.matched_booking) {
		await action.run(() => confirmArrivalRequest(request.id), t("arrivals.requests.confirmed"))
		return
	}

	// No booking: the member starts a walk-in, in a co-working space the desk names.
	walkInTarget.value = request
	walkInSpaceId.value = null
	spaceModalVisible.value = true
	if (spaces.value.length === 0) {
		spacesLoading.value = true
		try {
			spaces.value = await listSpaces()
		} finally {
			spacesLoading.value = false
		}
	}
	if (coSpaceOptions.value.length === 1) walkInSpaceId.value = coSpaceOptions.value[0].value as number
}

async function confirmWalkIn(): Promise<void> {
	const request = walkInTarget.value
	const spaceId = walkInSpaceId.value
	if (!request || spaceId === null) return

	const succeeded = await action.run(() => confirmArrivalRequest(request.id, spaceId), t("arrivals.requests.confirmed"))
	if (succeeded) spaceModalVisible.value = false
}

async function reject(request: ArrivalRequest): Promise<void> {
	await action.run(() => rejectArrivalRequest(request.id), t("arrivals.requests.rejected"))
}

const requestColumns = computed<DataTableColumns<ArrivalRequest>>(() => [
	{ title: t("arrivals.columns.member"), key: "user", minWidth: 160, render: row => row.user?.name ?? "—" },
	{
		title: t("arrivals.columns.requestedAt"),
		key: "requested_at",
		width: 110,
		render: row => h("bdi", { dir: "ltr", class: "font-mono text-xs" }, formatTime(row.requested_at))
	},
	{
		title: t("arrivals.columns.booking"),
		key: "matched_booking",
		minWidth: 200,
		render: (row) => {
			const booking = row.matched_booking
			if (!booking) return h(NTag, { size: "small", round: true }, { default: () => t("arrivals.requests.noBooking") })
			return h("span", [booking.space_name ?? `#${booking.space_id}`, " · ", h("bdi", { dir: "ltr", class: "font-mono text-xs" }, `${formatTime(booking.start_at)} – ${formatTime(booking.end_at)}`)])
		}
	},
	{
		title: t("activeSessions.columns.actions"),
		key: "actions",
		minWidth: 200,
		align: "center",
		render: row => h("div", { class: "flex justify-center gap-2" }, [
			h(NButton, { size: "small", type: "primary", onClick: () => confirm(row) }, { icon: () => h(Icon, { name: "carbon:checkmark", size: 16 }), default: () => t("arrivals.requests.confirm") }),
			h(NButton, { size: "small", secondary: true, onClick: () => reject(row) }, { icon: () => h(Icon, { name: "carbon:close", size: 16 }), default: () => t("arrivals.requests.reject") })
		])
	}
])

defineExpose({ requests, expected, checkIn, confirm, confirmWalkIn, reject, walkInSpaceId, spaceModalVisible, refetchAll })
</script>
