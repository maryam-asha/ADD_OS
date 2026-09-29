<!-- src/add-os/modules/booking/views/BookingCalendarPage.vue -->
<template>
	<div class="add-booking-calendar flex flex-col gap-5">
		<div class="flex items-start justify-between gap-4">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.calendar") }}</h1>
				<p>{{ t("bookingCalendar.description") }}</p>
			</div>
			<n-button type="primary" @click="openCreate()">
				<template #icon>
					<Icon name="carbon:calendar-add" :size="18" />
				</template>
				{{ t("bookingCalendar.create.button") }}
			</n-button>
		</div>

		<n-alert v-if="error" type="error" :title="t('bookingCalendar.loadError')" />

		<n-card>
			<div class="flex flex-wrap items-end justify-between gap-4">
				<div class="flex flex-wrap items-end gap-4">
					<!--
						Each select carries a visible label, not just a placeholder. A
						placeholder disappears the moment a value is chosen, which left
						two unlabelled pills on screen with nothing to say what they
						filtered.
					-->
					<!--
						The width sits on the label, not the select: Naive injects
						`.n-select { width: 100% }` after Tailwind, so a width class
						on the select loses and it fills a label that has shrunk to
						nothing in this wrapping row.
					-->
					<label class="add-filter-field">
						<span class="text-xs">{{ t("bookingCalendar.filters.spaceType") }}</span>
						<n-select
							v-model:value="spaceType"
							clearable
							:options="spaceTypeOptions"
							:placeholder="t('bookingCalendar.filters.allSpaceTypes')"
						/>
					</label>
					<label class="add-filter-field add-filter-field--wide">
						<span class="text-xs">{{ t("bookingCalendar.filters.space") }}</span>
						<n-select
							v-model:value="spaceId"
							clearable
							:options="spaceOptions"
							:placeholder="t('bookingCalendar.filters.allSpaces')"
						/>
					</label>
				</div>

				<div class="add-totals-group flex flex-wrap items-center gap-3">
					<div v-for="total in totalsSummary" :key="total.key" class="add-total-chip flex flex-col">
						<span class="text-xs opacity-75">{{ t(`bookingCalendar.totals.${total.key}`) }}</span>
						<span class="text-base font-bold">{{ total.value }}</span>
					</div>
				</div>
			</div>

			<div v-if="branchHours" class="add-branch-hours-bar mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
				<span class="inline-flex items-center gap-1.5 font-semibold text-primary">
					<Icon name="carbon:time" :size="16" />
					{{ branchHours.title }}
				</span>
				<span class="font-medium">{{ branchHours.hours ?? t("bookingCalendar.hours.closedToday") }}</span>
				<span v-if="branchHours.days_label" class="opacity-75">· {{ branchHours.days_label }}</span>
				<span class="text-xs opacity-60">({{ branchHours.timezone_note }})</span>
			</div>

			<div v-if="hasFilters" class="add-filters-reset-row mt-3 flex" :class="locale === 'ar' ? 'justify-end' : 'justify-start'">
				<n-button
					quaternary
					size="small"
					class="add-filters-reset-btn"
					@click="resetFilters"
				>
					<template #icon>
						<Icon name="carbon:filter-reset" :size="16" />
					</template>
					{{ t("bookingCalendar.filters.reset") }}
				</n-button>
			</div>
		</n-card>

		<!--
			The branch's co-working seats, and lending a room to co-working when
			they run out. After lending or taking a room back the calendar
			reloads: the room's cells and the co_space's occupancy both changed.
		-->
		<CoworkingPoolPanel
			v-if="poolBranchId !== null"
			:branch-id="poolBranchId"
			:rooms="lendableRooms"
			:today="districtToday()"
			@changed="load"
		/>

		<n-card class="add-calendar-card">
			<n-spin :show="isLoading">
				<div class="add-calendar-wrap">
					<FullCalendar ref="refCalendar" :options="calendarOptions" />
				</div>

				<div class="mt-4 flex flex-wrap items-center gap-4 text-xs">
					<span class="font-semibold opacity-80">{{ t("bookingCalendar.legend.title") }}:</span>
					<span v-for="status in LEGEND_STATUSES" :key="status" class="flex items-center gap-2">
						<span class="add-legend-swatch" :class="`c-${status}`" />
						<span class="font-medium">{{ t(`allBookings.status.${status}`) }}</span>
					</span>
					<span class="flex items-center gap-2">
						<span class="add-legend-swatch c-closed" />
						<span class="font-medium">{{ t("bookingCalendar.legend.closed") }}</span>
					</span>
				</div>
			</n-spin>
		</n-card>

		<!-- Booking detail -->
		<n-modal
			v-model:show="detailVisible"
			preset="card"
			class="max-w-md add-detail-modal"
			:title="t('bookingCalendar.detail.title')"
		>
			<template #header-extra>
				<n-tag v-if="selected" :type="STATUS_TAG_TYPE[selected.status]" size="small" :bordered="false" class="font-semibold">
					{{ selected.statusLabel }}
				</n-tag>
			</template>
			<n-descriptions v-if="selected" :column="1" label-placement="left" bordered size="small">
				<n-descriptions-item :label="t('bookingCalendar.detail.member')">
					<div class="flex flex-col">
						<span>{{ selected.memberName || "—" }}</span>
						<span class="text-xs">{{ selected.memberPhone || t("bookingCalendar.detail.noPhone") }}</span>
					</div>
				</n-descriptions-item>
				<n-descriptions-item :label="t('bookingCalendar.detail.space')">
					{{ selected.spaceName }}
				</n-descriptions-item>
				<n-descriptions-item :label="t('bookingCalendar.detail.when')">
					<div class="flex flex-col">
						<span>{{ selected.dateLabel }}</span>
						<span class="text-xs">{{ selected.timeLabel }}</span>
					</div>
				</n-descriptions-item>
				<n-descriptions-item :label="t('bookingCalendar.detail.status')">
					<n-tag :type="STATUS_TAG_TYPE[selected.status]" size="small" :bordered="false">
						{{ selected.statusLabel }}
					</n-tag>
				</n-descriptions-item>
				<n-descriptions-item :label="t('bookingCalendar.detail.payment')">
					{{ t(`allBookings.paymentState.${selected.paymentState}`) }}
				</n-descriptions-item>
				<n-descriptions-item :label="t('bookingCalendar.detail.checkedIn')">
					{{ selected.checkedInAt ? formatDateTime(selected.checkedInAt) : t("bookingCalendar.detail.notCheckedIn") }}
				</n-descriptions-item>
			</n-descriptions>
		</n-modal>

		<!-- Create booking -->
		<n-modal
			v-model:show="createVisible"
			preset="card"
			class="max-w-lg"
			:title="t('bookingCalendar.create.title')"
		>
			<n-form :model="createForm">
				<n-form-item
					:label="t('bookingCalendar.create.member')"
					:feedback="createErrors.user_id?.[0]"
					:validation-status="createErrors.user_id ? 'error' : undefined"
				>
					<n-select
						v-model:value="createForm.user_id"
						filterable
						:options="memberOptions"
						:loading="isLoadingMembers"
						:placeholder="t('bookingCalendar.create.memberPlaceholder')"
					/>
				</n-form-item>

				<n-form-item
					:label="t('bookingCalendar.create.space')"
					:feedback="createErrors.space_id?.[0]"
					:validation-status="createErrors.space_id ? 'error' : undefined"
				>
					<n-select
						v-model:value="createForm.space_id"
						:options="creatableSpaceOptions"
						:placeholder="t('bookingCalendar.create.spacePlaceholder')"
					/>
				</n-form-item>

				<n-form-item
					:label="t('bookingCalendar.create.date')"
					:feedback="createErrors.start_at?.[0]"
					:validation-status="createErrors.start_at ? 'error' : undefined"
				>
					<n-date-picker
						v-model:formatted-value="createForm.date"
						type="date"
						value-format="yyyy-MM-dd"
						class="w-full"
						:is-date-disabled
					/>
				</n-form-item>

				<!--
					A booking is a run of the space's own cells, picked by its first
					and last cell — the same as the member app. No duration comes
					first: the cells are the server's, each judged on its own, and
					the run's length follows from the two taps. A free-form clock
					would let an operator enter 14:07 on a 30-minute grid and learn
					it was wrong only from the 422.
				-->
				<n-form-item :label="t('bookingCalendar.create.time')">
					<div class="flex w-full flex-col gap-2">
						<n-spin :show="isLoadingSlots" :size="14">
							<div v-if="slotsBanner" class="add-slot-note">{{ slotsBanner }}</div>

							<template v-else-if="slots.length > 0">
								<p class="add-slot-counts">{{ t("bookingCalendar.create.pickHint") }}</p>
								<div class="add-slot-grid">
									<!--
										A taken cell stays visible and disabled rather than
										being dropped: "2pm is booked" and "2pm does not
										exist here" are different facts, and an operator
										needs to tell them apart. Cells whose time has gone
										— started, or inside the minimum notice — are not
										shown at all: nothing can be done with them.
									-->
									<button
										v-for="slot in slots"
										:key="slot.start_time"
										type="button"
										class="add-slot"
										:class="{
											'add-slot--active': isInRun(slot),
											'add-slot--taken': !slot.is_available
										}"
										:disabled="!slot.is_available"
										:aria-pressed="isInRun(slot)"
										@click="selectSlot(slot)"
									>
										<!--
											The server's own "01:00 PM", shown as sent and sent as
											shown — one format for the start, the end and the
											selected run, with nothing converted on either side.
										-->
										<span>{{ slot.start_time }}</span>
										<span class="add-slot__meta">{{ slot.end_time }}</span>
									</button>
								</div>
							</template>

							<div v-else-if="!isLoadingSlots" class="add-slot-note">
								{{ t("bookingCalendar.create.noSlots") }}
							</div>
						</n-spin>

						<p v-if="slotCountsNote" class="add-slot-counts add-slot-counts--hint">{{ slotCountsNote }}</p>

						<div v-if="selectedRun" class="add-slot-counts add-slot-counts--selected">
							<Icon name="carbon:checkmark" :size="18" class="shrink-0 mt-0.5" />
							<div class="flex flex-col gap-0.5 grow">
								<span class="font-semibold text-sm leading-tight">
									<template v-if="locale === 'ar'">
										من <bdi dir="ltr">{{ selectedRun.startTime }}</bdi> إلى <bdi dir="ltr">{{ selectedRun.endTime }}</bdi>
									</template>
									<template v-else>{{ selectedRun.startTime }} – {{ selectedRun.endTime }}</template>
								</span>
								<span class="text-xs opacity-85 font-medium leading-tight">
									· {{ hoursLabel(selectedRun.minutes) }}
								</span>
							</div>
						</div>
						<p v-if="runTooShort" class="add-slot-warning">
							<Icon name="carbon:warning" :size="16" class="shrink-0" />
							<span>
								{{ t("bookingCalendar.create.tooShort", { minimum: hoursLabel(minimumMinutes) }) }}
							</span>
						</p>
					</div>
				</n-form-item>

				<n-form-item :label="t('bookingCalendar.create.note')">
					<n-input
						v-model:value="createForm.note"
						type="textarea"
						:rows="2"
						:placeholder="t('bookingCalendar.create.notePlaceholder')"
					/>
				</n-form-item>

				<n-alert type="info" :bordered="false">{{ t("bookingCalendar.create.rulesNote") }}</n-alert>
			</n-form>

			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="createVisible = false">{{ t("resourceCrud.form.cancel") }}</n-button>
					<n-button type="primary" :loading="isCreating" :disabled="!canSubmit" @click="submitCreate">
						{{ t("bookingCalendar.create.submit") }}
					</n-button>
				</div>
			</template>
		</n-modal>
	</div>
</template>

<script setup lang="ts">
import type { CalendarApi, CalendarOptions, EventInput } from "@fullcalendar/core"
import type { SelectOption } from "naive-ui"
import type { AvailabilitySlot } from "@/add-os/modules/booking/types/availability"
import type { BookingPaymentState, BookingStatus, CalendarResponse, CalendarView } from "@/add-os/modules/booking/types/calendar"
import type { Member } from "@/add-os/modules/members/types/member"
import type { SpaceType } from "@/add-os/modules/spatial/types/space"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import listPlugin from "@fullcalendar/list"
import timeGridPlugin from "@fullcalendar/timegrid"
import FullCalendar from "@fullcalendar/vue3"
import {
	NAlert,
	NButton,
	NCard,
	NDatePicker,
	NDescriptions,
	NDescriptionsItem,
	NForm,
	NFormItem,
	NInput,
	NModal,
	NSelect,
	NSpin,
	NTag,
	useMessage
} from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import CoworkingPoolPanel from "@/add-os/modules/booking/components/CoworkingPoolPanel.vue"
import { spaceTypeLabel } from "@/add-os/modules/booking/config/space-type-label"
import { SPACE_TYPES } from "@/add-os/modules/spatial/types/space"
import { ApiError } from "@/add-os/services/api"
import { getCalendar, getSpaceSlots } from "@/add-os/services/booking-calendar"
import { listMembers } from "@/add-os/services/members"
import { createReceptionBooking } from "@/add-os/services/reception"
import { formatDate, formatDateTime, formatNumber, formatTime } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * The operations calendar: every booking in the district, on the FullCalendar
 * the template already ships.
 *
 * FullCalendar rather than a hand-built grid, and it is worth saying why the
 * first attempt was wrong: a table of shaded cells answers "how full is this
 * space today" but not "what is actually on at 2pm", which is the question an
 * operator standing at the desk is usually asking.
 *
 * `@fullcalendar/*` is imported from `node_modules` — a declared dependency,
 * not vendor source. Nothing is imported from `src/views/Apps/**`, which stays
 * Category C.
 *
 * Two actions live here, and only two. Clicking a booking opens a read-only
 * detail; the header button books a member in. Everything else about a booking
 * — approve, reject, check in, check out, cancel, settle, extend — stays on the
 * reception screens, because that is where those rules already live and a
 * second copy of them would be free to drift.
 *
 * Creation goes through the same `BookingCreationService` the member app uses,
 * so reception cannot double-book a room the member endpoint would refuse, and
 * cannot back-date one either. Every refusal arrives as a 422 with its own
 * translated message, which is shown verbatim rather than re-worded here.
 */

defineProps<{ titleKey?: string }>()

const { t, locale } = useI18n()
const message = useMessage()

/** The statuses the legend explains, in the order it lists them. */
const LEGEND_STATUSES: readonly BookingStatus[] = ["confirmed", "pending", "cancelled", "rejected"]

const STATUS_TAG_TYPE: Readonly<Record<BookingStatus, "success" | "warning" | "default" | "error">> = {
	confirmed: "success",
	pending: "warning",
	cancelled: "default",
	rejected: "error"
}

/**
 * FullCalendar view name → the `view` this API accepts. `listMonth` maps to
 * `month`: the list is a different rendering of the same month, not a
 * different range.
 */
const VIEW_BY_FC_TYPE: Readonly<Record<string, CalendarView>> = {
	dayGridMonth: "month",
	timeGridWeek: "week",
	timeGridDay: "day",
	listMonth: "month"
}

function toIsoDate(date: Date): string {
	const month = String(date.getMonth() + 1).padStart(2, "0")
	const day = String(date.getDate()).padStart(2, "0")
	return `${date.getFullYear()}-${month}-${day}`
}

/**
 * Today's date in the given IANA timezone, as `YYYY-MM-DD`.
 *
 * The district's today, not the browser's: the server decides "past" in its
 * own timezone, and a desk machine on UTC at 01:30 Damascus time would
 * otherwise still offer yesterday. `en-CA` is used only because it formats a
 * date as `YYYY-MM-DD`; nothing is shown to the user.
 */
function todayIn(timeZone: string | undefined): string {
	if (!timeZone) return toIsoDate(new Date())
	return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())
}

const refCalendar = ref()
const response = ref<CalendarResponse | null>(null)
const isLoading = ref(true)
const error = ref<ApiError | null>(null)

const spaceType = ref<SpaceType | null>(null)
const spaceId = ref<number | null>(null)

const hasFilters = computed(() => spaceType.value !== null || spaceId.value !== null)

function resetFilters(): void {
	spaceType.value = null
	spaceId.value = null
}

/**
 * What the calendar is currently showing.
 *
 * Seeded with today so the first paint has data: FullCalendar opens on the
 * current month, and waiting for its first `datesSet` would leave the screen
 * blank until the user navigated. Every later change comes from `datesSet`,
 * which is authoritative.
 */
const activeView = ref<CalendarView>("month")
const activeDate = ref<string>(toIsoDate(new Date()))

const branchHours = computed(() => response.value?.branch_hours ?? null)

/** The district's today, in the timezone the calendar response names. */
function districtToday(): string {
	return todayIn(response.value?.range.timezone ?? response.value?.branch_hours?.timezone)
}

/**
 * The branch's all-day closures from today on, date → the exception's reason,
 * as the server listed them: every one, not just those in the range the
 * calendar is showing, because the date picker navigates freely.
 */
const closures = computed(
	() => new Map((response.value?.branch_hours?.upcoming_closures ?? []).map(closure => [closure.date, closure.reason]))
)

const totalsSummary = computed(() => {
	const totals = response.value?.totals
	if (!totals) return []
	return [
		{ key: "spaces", value: formatNumber(totals.spaces) },
		{ key: "bookings", value: formatNumber(totals.bookings) },
		{ key: "occupancy", value: `${formatNumber(totals.occupancy_percent)}%` }
	]
})

const spaceTypeOptions = computed<SelectOption[]>(() =>
	SPACE_TYPES.map(type => ({ label: spaceTypeLabel(t, type), value: type }))
)

/**
 * Space options, read off whatever the current response returned rather than
 * fetched separately — the calendar has already named every active space in
 * range, and a second request would only risk disagreeing with it.
 */
const spaceOptions = computed<SelectOption[]>(() =>
	(response.value?.resources ?? []).map(resource => ({
		label: resource.space.title ?? spaceTypeLabel(t, resource.space.space_type),
		value: resource.space.id
	}))
)

/** The create form offers the same spaces, minus any the filter narrowed away. */
const creatableSpaceOptions = spaceOptions

/** The branch whose co-working pool the panel shows: the calendar's. */
const poolBranchId = computed(() => response.value?.meta.branch_id ?? null)

/** Rooms in view, which staff may lend to co-working when it overflows. */
const lendableRooms = computed(() =>
	(response.value?.resources ?? [])
		.filter(resource => resource.space.space_type === "room")
		.map(resource => ({
			id: resource.space.id,
			title: resource.space.title ?? spaceTypeLabel(t, resource.space.space_type),
			capacity: resource.space.capacity
		}))
)

// ---------------------------------------------------------------
// Detail — declared before the calendar options that populate it
// ---------------------------------------------------------------

interface SelectedBooking {
	id: number
	status: BookingStatus
	statusLabel: string
	spaceName: string
	memberName: string | null
	memberPhone: string | null
	paymentState: BookingPaymentState
	checkedInAt: string | null
	dateLabel: string
	timeLabel: string
}

const selected = ref<SelectedBooking | null>(null)

// ---------------------------------------------------------------
// Events
// ---------------------------------------------------------------

const events = computed<EventInput[]>(() => {
	const out: EventInput[] = []
	const closedDates = new Set<string>()

	for (const resource of response.value?.resources ?? []) {
		const spaceName = resource.space.title ?? spaceTypeLabel(t, resource.space.space_type)

		for (const day of resource.days) {
			if (day.state === "closed") {
				closedDates.add(day.date)
			}

			for (const booking of day.bookings) {
				out.push({
					id: String(booking.id),
					title: `${spaceName} · ${booking.member.name ?? ""}`.trim().replace(/ ·\s*$/, ""),
					start: booking.start_at,
					end: booking.end_at,
					classNames: [`c-${booking.status}`, "styled"],
					extendedProps: {
						bookingId: booking.id,
						statusLabel: booking.status_label,
						status: booking.status,
						spaceName,
						memberName: booking.member.name,
						memberPhone: booking.member.phone,
						paymentState: booking.payment_state,
						checkedInAt: booking.checked_in_at,
						startAt: booking.start_at,
						endAt: booking.end_at
					}
				})
			}
		}
	}

	// A day is only closed if it is closed for every space in view — one space
	// under maintenance does not shut the branch.
	const spaceCount = response.value?.resources.length ?? 0
	for (const date of closedDates) {
		const closedEverywhere = (response.value?.resources ?? []).every(
			resource => resource.days.find(day => day.date === date)?.state === "closed"
		)
		// A listed closure is drawn below, with its reason; drawing it here too
		// would stack two shades on one cell.
		if (closedEverywhere && spaceCount > 0 && !closures.value.has(date)) {
			out.push({ start: date, allDay: true, display: "background", classNames: ["c-closed"] })
		}
	}

	// Every upcoming closure, whether or not any space row is in view, carrying
	// the exception's own reason as its label — "Labour Day" answers "why can't
	// I book the 30th" before anyone clicks.
	for (const [date, reason] of closures.value) {
		out.push({
			start: date,
			allDay: true,
			display: "background",
			title: reason ?? t("bookingCalendar.legend.closed"),
			classNames: ["c-closed"]
		})
	}

	return out
})

const calendarOptions = computed<CalendarOptions>(() => ({
	plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
	initialView: "dayGridMonth",
	headerToolbar: {
		start: "prev,next today",
		center: "title",
		end: "dayGridMonth,timeGridWeek,timeGridDay,listMonth"
	},
	// Sunday, matching the working week the backend's `week` view spans.
	firstDay: 0,
	locale: locale.value,
	direction: locale.value === "ar" ? "rtl" : "ltr",
	height: "auto",
	dayMaxEvents: 3,
	moreLinkText: (n: number) => `+${n}`,
	navLinks: true,
	events: events.value,
	eventTimeFormat: { hour: "2-digit", minute: "2-digit", meridiem: "short" },
	// Read-only on the grid itself: no editable, no drag, no resize. Clicking
	// opens a detail; creating goes through the form, where the member and the
	// space are stated explicitly.
	// Clicking an empty day opens the form on that date. The grid stays
	// read-only otherwise — no drag, no resize, no inline edit — because
	// moving a booking is an approval-bearing action that lives on the
	// reception screens.
	//
	// A day that cannot take a booking opens nothing — past, an upcoming
	// closure, a weekday the branch never opens, or beyond the booking window —
	// because a form opened on one could only fail.
	dateClick(info) {
		const date = info.dateStr.slice(0, 10)
		if (!isBookableDate(date)) return
		openCreate({ date })
	},
	// A closed day — an upcoming closure or a weekday the branch never opens —
	// has its number struck through, matching the struck-through date in the
	// picker. A day beyond the booking window is only dimmed: it is open, just
	// not bookable yet.
	dayCellClassNames(arg) {
		const date = toIsoDate(arg.date)
		if (closures.value.has(date) || isClosedWeekday(date)) return ["add-day--closed"]
		return isBeyondWindow(date) ? ["add-day--out-of-window"] : []
	},
	eventClick(info) {
		const props = info.event.extendedProps as Record<string, unknown>
		// A closed-day background event carries no booking; clicking it opens
		// nothing rather than an empty detail.
		if (!props.bookingId) return
		selected.value = {
			id: props.bookingId as number,
			status: props.status as BookingStatus,
			statusLabel: props.statusLabel as string,
			spaceName: props.spaceName as string,
			memberName: props.memberName as string | null,
			memberPhone: props.memberPhone as string | null,
			paymentState: props.paymentState as BookingPaymentState,
			checkedInAt: props.checkedInAt as string | null,
			dateLabel: formatDate(props.startAt as string),
			timeLabel: `${formatTime(props.startAt as string)} – ${formatTime(props.endAt as string)}`
		}
	},
	datesSet(info) {
		const view = VIEW_BY_FC_TYPE[info.view.type] ?? "month"
		// `info.start` is the first visible cell, which in a month grid can be
		// in the previous month. The anchor the server needs is a date inside
		// the period, so the midpoint of the visible range is used.
		const midpoint = new Date((info.start.getTime() + info.end.getTime()) / 2)
		const nextDate = toIsoDate(midpoint)

		if (view !== activeView.value || nextDate !== activeDate.value) {
			activeView.value = view
			activeDate.value = nextDate
		}
	}
}))

const detailVisible = computed({
	get: () => selected.value !== null,
	set: (value: boolean) => {
		if (!value) selected.value = null
	}
})

// ---------------------------------------------------------------
// Create
// ---------------------------------------------------------------

const createVisible = ref(false)
const isCreating = ref(false)
const createErrors = ref<Record<string, string[]>>({})

const members = ref<Member[]>([])
const isLoadingMembers = ref(false)

const createForm = ref({
	user_id: null as number | null,
	space_id: null as number | null,
	date: toIsoDate(new Date()),
	/** The first cell of the run — a `start_time` from the server's list, never typed. */
	from: "" as string,
	/** The last cell of the run, by its `start_time`; the booking ends at its `end_time`. */
	to: "" as string,
	note: ""
})

/**
 * The cells, exactly as the server sent them. A cell whose time to be booked
 * has gone — started, or inside the minimum notice — is not among them: the
 * server leaves it out, for the desk as for the member app. Every other
 * refusal is sent, and stays on screen with its reason.
 */
const slots = ref<AvailabilitySlot[]>([])
const isLoadingSlots = ref(false)
const slotsBanner = ref<string | null>(null)

/** Each cell's length, from the last slots asked for: a run is its cells × this. */
const granularityMinutes = ref(0)

/** "1.5h" — the number through the shared formatter, the unit through i18n. */
function hoursLabel(minutes: number): string {
	return t("bookingCalendar.create.durationHours", { hours: formatNumber(minutes / 60) })
}

/**
 * Where a cell sits in the day, by its `start_time`.
 *
 * Cells are ordered by position, never by comparing their times: the times
 * are 12-hour ("01:00 PM"), which sort wrongly as text — "01:00 PM" comes
 * before "11:00 AM".
 */
function indexOf(startTime: string): number {
	return slots.value.findIndex(slot => slot.start_time === startTime)
}

/**
 * The chosen run: the cells from the first to the last, in order.
 *
 * `null` unless every cell between is free and each starts where the one
 * before it ends — a taken cell or the gap of a closed hour breaks a run, and
 * a broken run is not a booking.
 */
const selectedRun = computed(() => {
	const first = indexOf(createForm.value.from)
	const last = indexOf(createForm.value.to)
	if (first === -1 || last === -1 || last < first) return null

	const cells = slots.value.slice(first, last + 1)
	const unbroken = cells.every(
		(cell, index) => cell.is_available && (index === 0 || cell.start_time === cells[index - 1].end_time)
	)
	if (!unbroken) return null

	return {
		first,
		last,
		// Shown and posted exactly as the server wrote them.
		startTime: cells[0].start_time,
		endTime: cells[cells.length - 1].end_time,
		// Unbroken, so every cell is one step of the grid — not parsed from
		// the 12-hour text.
		minutes: cells.length * granularityMinutes.value
	}
})

/**
 * The shortest booking, from the calendar's setup — read once, as the member
 * app reads it once from the space details. One cell until it arrives.
 */
const minimumMinutes = computed(() => response.value?.booking_window?.min_duration_minutes ?? 0)

/** A picked run shorter than the minimum: said on screen, and not submittable. */
const runTooShort = computed(() => selectedRun.value !== null && selectedRun.value.minutes < minimumMinutes.value)

function isInRun(slot: AvailabilitySlot): boolean {
	const run = selectedRun.value
	const index = indexOf(slot.start_time)
	return run !== null && index >= run.first && index <= run.last
}

/**
 * How many of the day's cells are free, so an operator can see at a glance
 * that a day is busy rather than inferring it from greyed chips.
 */
const slotCountsNote = computed(() => {
	if (slots.value.length === 0) return null
	const available = slots.value.filter(slot => slot.is_available).length
	return t("bookingCalendar.create.slotCounts", { available, total: slots.value.length })
})

// ---------------------------------------------------------------
// Which dates can be booked — the calendar's setup, as the member app has it
// ---------------------------------------------------------------

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const

function addDays(isoDate: string, days: number): string {
	const date = new Date(`${isoDate}T12:00:00`)
	date.setDate(date.getDate() + days)
	return toIsoDate(date)
}

/** A weekday the branch does not open on at all, from its ordinary week. */
function isClosedWeekday(isoDate: string): boolean {
	const open = response.value?.branch_hours?.open_weekdays
	if (!open || open.length === 0) return false
	return !open.includes(WEEKDAYS[new Date(`${isoDate}T12:00:00`).getDay()])
}

/** Further ahead than `max_days_ahead` allows; `null` is no limit. */
function isBeyondWindow(isoDate: string): boolean {
	const maxDaysAhead = response.value?.booking_window?.max_days_ahead ?? null
	return maxDaysAhead !== null && isoDate > addDays(districtToday(), maxDaysAhead)
}

/**
 * Whether a date can take a booking at all, from the setup alone: not past,
 * not an upcoming closure, not a weekday the branch never opens, not beyond the
 * booking window. The same checks the member app makes from the space details,
 * and the reason the grid and the picker refuse the same dates.
 *
 * It says nothing about a date being full — that depends on other bookings,
 * and the slots for the date answer it.
 */
function isBookableDate(isoDate: string): boolean {
	return !(
		isoDate < districtToday()
		|| closures.value.has(isoDate)
		|| isClosedWeekday(isoDate)
		|| isBeyondWindow(isoDate)
	)
}

/** The next date, from the district's today, that can take a booking. */
function nextOpenDate(): string {
	let date = districtToday()
	// Bounded: a year with no bookable day is not a real schedule, and an
	// unbounded loop over server data is not worth the risk.
	for (let i = 0; i < 366 && !isBookableDate(date); i++) {
		date = addDays(date, 1)
	}
	return isBookableDate(date) ? date : districtToday()
}

/**
 * The picker refuses what the grid refuses, plus a day the calendar reports
 * closed for every space in view — which also covers a space-level closure the
 * branch's week does not show.
 */
function isDateDisabled(timestamp: number): boolean {
	const date = toIsoDate(new Date(timestamp))
	if (!isBookableDate(date)) return true

	const resources = response.value?.resources ?? []
	if (resources.length === 0) return false
	return resources.every(resource => resource.days.find(day => day.date === date)?.state === "closed")
}

const memberOptions = computed<SelectOption[]>(() =>
	members.value.map(member => ({ label: `${member.name} · ${member.phone}`, value: member.id }))
)

/**
 * Nothing about availability is judged here beyond the run itself.
 *
 * The form can only submit an unbroken run of cells the server listed as free,
 * at least the space's minimum long, so the client needs no opinion about
 * granularity, overlap, buffer or back-dating — it renders the server's
 * verdict. That verdict can still go stale between load and submit, which is
 * why the POST re-checks the whole run under a row lock and its 422 is shown
 * verbatim.
 */
const canSubmit = computed(
	() =>
		createForm.value.user_id !== null
		&& createForm.value.space_id !== null
		&& selectedRun.value !== null
		&& !runTooShort.value
)

/**
 * Opens the form, optionally on a date and space the operator already clicked.
 *
 * Prefilling from the click is the point: an operator who clicked Thursday on
 * the grid has already said which day they mean, and making them re-enter it
 * is how the form felt disconnected from the calendar it sits on.
 */
function openCreate(prefill?: { date?: string, spaceId?: number }): void {
	createErrors.value = {}
	// Without a clicked day, the next one that can actually be booked: on a
	// holiday, today would open the form on a date the picker already refuses.
	createForm.value.date = prefill?.date ?? nextOpenDate()
	createForm.value.from = ""
	createForm.value.to = ""

	if (prefill?.spaceId !== undefined) {
		createForm.value.space_id = prefill.spaceId
	} else if (createForm.value.space_id === null) {
		// One space in view is not a choice; preselecting it saves a click and
		// lets the slot grid load immediately.
		const only = creatableSpaceOptions.value.length === 1 ? creatableSpaceOptions.value[0] : null
		createForm.value.space_id = only ? (only.value as number) : null
	}

	createVisible.value = true

	if (members.value.length === 0 && !isLoadingMembers.value) {
		void loadMembers()
	}
	void loadSlots()
}

/**
 * The cells for the chosen space and date.
 *
 * Re-fetched on every change of either, because a cell list is only true for
 * one space and one day — reusing yesterday's would offer windows that are
 * already gone.
 */
let slotsRequest = 0

async function loadSlots(): Promise<void> {
	const { space_id: spaceId, date } = createForm.value
	if (spaceId === null || !date) {
		slots.value = []
		slotsBanner.value = null
		return
	}

	const request = ++slotsRequest
	isLoadingSlots.value = true
	slotsBanner.value = null
	try {
		const response_ = await getSpaceSlots(spaceId, date)
		// A slower answer for a space or date the operator has since moved off
		// must not overwrite the current one.
		if (request !== slotsRequest) return

		granularityMinutes.value = response_.meta.granularity_minutes
		slots.value = response_.slots
		// A closed day carries the server's own banner, reason included.
		slotsBanner.value = response_.closed_banner?.text ?? null
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		if (request !== slotsRequest) return
		slots.value = []
		slotsBanner.value = caught.data?.message ?? t("bookingCalendar.create.slotsError")
	} finally {
		if (request === slotsRequest) isLoadingSlots.value = false
	}
}

/**
 * Picks the run, first cell then last.
 *
 * The first tap starts a run of one cell. A later tap on a free cell after it
 * ends the run there, if every cell between is free and unbroken; anything
 * else — an earlier cell, a run already made, a gap in between — starts a new
 * run at the tapped cell. A taken cell cannot be picked at all.
 */
function selectSlot(slot: AvailabilitySlot): void {
	if (!slot.is_available) return

	const { from, to } = createForm.value
	const startingNew = from === "" || from !== to || indexOf(slot.start_time) <= indexOf(from)
	if (startingNew) {
		createForm.value.from = slot.start_time
		createForm.value.to = slot.start_time
		return
	}

	createForm.value.to = slot.start_time
	// A broken stretch between the two taps is not a run: start over here.
	if (selectedRun.value === null) {
		createForm.value.from = slot.start_time
		createForm.value.to = slot.start_time
	}
}

// A new space or date invalidates the chosen run: the cells free on Tuesday
// say nothing about Wednesday.
watch(
	() => [createForm.value.space_id, createForm.value.date],
	() => {
		createForm.value.from = ""
		createForm.value.to = ""
		if (createVisible.value) void loadSlots()
	}
)

async function loadMembers(): Promise<void> {
	isLoadingMembers.value = true
	try {
		members.value = await listMembers()
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		// A failed member list leaves the picker empty rather than blocking the
		// modal; the operator sees an empty select and can close it.
		members.value = []
	} finally {
		isLoadingMembers.value = false
	}
}

async function submitCreate(): Promise<void> {
	if (!canSubmit.value) return

	isCreating.value = true
	createErrors.value = {}
	try {
		await createReceptionBooking({
			user_id: createForm.value.user_id as number,
			space_id: createForm.value.space_id as number,
			// Wall-clock in the district's own timezone, which is what the
			// endpoint expects — an offset here would be re-interpreted.
			//
			// The run's own first start and last end, both the server's values
			// — not minutes added here.
			start_at: `${createForm.value.date} ${selectedRun.value!.startTime}`,
			end_at: `${createForm.value.date} ${selectedRun.value!.endTime}`,
			...(createForm.value.note ? { note: createForm.value.note } : {})
		})
		message.success(t("bookingCalendar.create.success"))
		createVisible.value = false
		await load()
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		createErrors.value = caught.data?.errors ?? {}
		// The server's own sentence, shown as-is: it already names the rule
		// that was broken, in the requested language.
		if (caught.data?.message) message.error(caught.data.message)
	} finally {
		isCreating.value = false
	}
}

// ---------------------------------------------------------------
// Load
// ---------------------------------------------------------------

async function load(): Promise<void> {
	isLoading.value = true
	error.value = null
	try {
		response.value = await getCalendar({
			view: activeView.value,
			date: activeDate.value,
			...(spaceType.value ? { space_type: spaceType.value } : {}),
			...(spaceId.value ? { space_id: spaceId.value } : {})
		})
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		error.value = caught
		response.value = null
	} finally {
		isLoading.value = false
	}
}

watch([activeView, activeDate, spaceType, spaceId], load, { immediate: true })

/** Exposed for the calendar API in tests and for a future refresh control. */
defineExpose({
	calendarApi: (): CalendarApi | undefined => refCalendar.value?.getApi()
})
</script>

<style scoped lang="scss">
/**
 * ADD OS Operations Calendar styling:
 * Fully styled for theme compatibility, RTL/LTR support, crisp readable slots,
 * opaque elevated popover dialogs, and accessible contrast.
 */
.add-booking-calendar {
	position: relative;
	z-index: 2;

	.add-total-chip {
		padding: var(--add-space-2, 0.5rem) var(--add-space-4, 1rem);
		border-radius: var(--border-radius, 8px);
		background-color: var(--bg-secondary-color);
		border: 1px solid var(--border-color);
		min-inline-size: 5.5rem;
		transition: border-color 0.15s ease;
	}

	.add-branch-hours-bar {
		padding: var(--add-space-2, 0.5rem) var(--add-space-3, 0.75rem);
		background-color: var(--bg-secondary-color);
		border-radius: var(--border-radius, 8px);
		border: 1px solid var(--border-color);
	}

	.add-calendar-card {
		position: relative;
		z-index: 2;
		overflow: visible;

		:deep(.n-card__content) {
			overflow: visible;
		}
	}

	.add-calendar-wrap {
		min-height: 34rem;
	}

	:deep(.fc) {
		--fc-border-color: var(--border-color);
		--fc-page-bg-color: var(--bg-default-color, #ffffff);
		--fc-neutral-bg-color: var(--bg-secondary-color, #f7f5f2);
		--fc-today-bg-color: rgba(var(--primary-color-rgb) / 0.06);
		--fc-event-text-color: var(--fg-default-color, #333333);
		--fc-event-border-color: var(--border-color);
		--fc-event-bg-color: var(--bg-secondary-color);
		--fc-now-indicator-color: var(--primary-color);

		font-family: inherit;

		// ── Toolbar ──────────────────────────────────────────────
		.fc-toolbar {
			margin-bottom: 1.25rem !important;
			gap: 0.75rem;
			flex-wrap: wrap;

			.fc-toolbar-title {
				font-size: 1.25rem;
				font-weight: 700;
				color: var(--fg-default-color);
				letter-spacing: -0.01em;
			}

			.fc-button {
				background-color: var(--bg-secondary-color);
				border-color: var(--border-color);
				color: var(--fg-default-color);
				box-shadow: none !important;
				text-transform: capitalize;
				font-weight: 500;
				font-size: 0.8125rem;
				padding: 0.45rem 0.9rem;
				border-radius: 6px;
				transition: all 0.15s ease;

				&:hover {
					background-color: rgba(var(--primary-color-rgb) / 0.12);
					border-color: var(--primary-color);
					color: var(--primary-color);
				}

				&.fc-button-active {
					background-color: var(--primary-color) !important;
					border-color: var(--primary-color) !important;
					color: #ffffff !important;
					font-weight: 600;
				}

				&:disabled {
					opacity: 0.45;
					cursor: not-allowed;
				}
			}

			.fc-button-group {
				gap: 1px;
				border-radius: 7px;
				overflow: hidden;

				.fc-button {
					border-radius: 0;
					&:first-child {
						border-start-start-radius: 6px;
						border-end-start-radius: 6px;
					}
					&:last-child {
						border-start-end-radius: 6px;
						border-end-end-radius: 6px;
					}
				}
			}
		}

		// ── Table & Headers ──────────────────────────────────────
		.fc-scrollgrid {
			border-radius: 8px;
			overflow: hidden;
		}

		.fc-scrollgrid-section-sticky > * {
			background: var(--bg-default-color, #ffffff) !important;
		}

		.fc-col-header-cell {
			background-color: var(--bg-secondary-color);
			padding: 8px 0;
			border-color: var(--border-color);

			.fc-col-header-cell-cushion {
				color: var(--fg-secondary-color);
				font-size: 0.8125rem;
				font-weight: 600;
				text-decoration: none;
			}
		}

		// ── Day Grid & Days ──────────────────────────────────────
		.fc-daygrid-day-number {
			color: var(--fg-secondary-color);
			font-size: 0.8125rem;
			font-weight: 600;
			padding: 6px 8px;
			text-decoration: none;
		}

		.fc-day-today {
			background-color: rgba(var(--primary-color-rgb) / 0.05) !important;

			.fc-daygrid-day-number {
				color: var(--primary-color);
				font-weight: 700;
			}
		}

		// ── Event Styling (Common, High-contrast, Accessible) ───
		.fc-event {
			font-family: inherit;
			font-size: 0.8125rem;

			.fc-event-main {
				color: var(--fg-default-color) !important;
			}
			.fc-event-title {
				color: var(--fg-default-color) !important;
			}
			.fc-event-time {
				color: var(--fg-secondary-color) !important;
			}
		}

		.fc-event.styled {
			border-radius: 6px !important;
			border-width: 1px !important;
			border-style: solid !important;
			border-inline-start-width: 4px !important;
			border-inline-start-style: solid !important;
			padding: 2px 4px !important;
			cursor: pointer;
			box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
			transition: transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;

			&:hover {
				box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12) !important;
				z-index: 6 !important;
			}

			&.c-confirmed {
				background-color: rgba(var(--success-color-rgb) / 0.16) !important;
				border-color: rgba(var(--success-color-rgb) / 0.35) !important;
				border-inline-start-color: var(--success-color) !important;
				color: var(--fg-default-color) !important;

				&:hover {
					background-color: rgba(var(--success-color-rgb) / 0.24) !important;
				}
				.fc-event-main,
				.fc-event-title {
					color: var(--fg-default-color) !important;
				}
				.fc-event-time {
					color: var(--fg-secondary-color) !important;
				}
			}

			&.c-pending {
				background-color: rgba(var(--warning-color-rgb) / 0.18) !important;
				border-color: rgba(var(--warning-color-rgb) / 0.4) !important;
				border-inline-start-color: var(--warning-color) !important;
				color: var(--fg-default-color) !important;

				&:hover {
					background-color: rgba(var(--warning-color-rgb) / 0.26) !important;
				}
				.fc-event-main,
				.fc-event-title {
					color: var(--fg-default-color) !important;
				}
				.fc-event-time {
					color: var(--fg-secondary-color) !important;
				}
			}

			&.c-cancelled {
				background-color: var(--bg-secondary-color) !important;
				border-color: var(--border-color) !important;
				border-inline-start-color: var(--border-color) !important;
				color: var(--fg-secondary-color) !important;
				opacity: 0.7;

				.fc-event-main,
				.fc-event-title,
				.fc-event-time {
					color: var(--fg-secondary-color) !important;
					text-decoration: line-through;
				}
			}

			&.c-rejected {
				background-color: rgba(var(--error-color-rgb) / 0.16) !important;
				border-color: rgba(var(--error-color-rgb) / 0.35) !important;
				border-inline-start-color: var(--error-color) !important;
				color: var(--fg-default-color) !important;

				&:hover {
					background-color: rgba(var(--error-color-rgb) / 0.24) !important;
				}
				.fc-event-main,
				.fc-event-title {
					color: var(--fg-default-color) !important;
				}
				.fc-event-time {
					color: var(--fg-secondary-color) !important;
				}
			}
		}

		// ── TimeGrid (Week & Day Views) ─────────────────────────
		.fc-timegrid-slot {
			height: 2.25rem !important;
			border-bottom: 0 !important;
		}

		.fc-timegrid-slot-minor {
			border-top-style: dashed !important;
			border-top-color: rgba(var(--border-color-rgb, 120, 120, 120) / 0.25) !important;
		}

		.fc-timegrid-slot-label {
			vertical-align: middle;
			font-size: 0.75rem;
			font-weight: 600;
			color: var(--fg-secondary-color);
		}

		.fc-timegrid-axis-cushion {
			padding: 0 8px !important;
		}

		.fc-timegrid-now-indicator-line {
			border-color: var(--primary-color) !important;
			border-width: 2px 0 0 !important;
		}

		.fc-timegrid-now-indicator-arrow {
			border-color: var(--primary-color) !important;
		}

		.fc-timegrid-event {
			margin-bottom: 2px !important;

			.fc-event-main {
				padding: 6px 8px !important;
				display: flex !important;
				flex-direction: column !important;
				gap: 3px !important;
				color: var(--fg-default-color) !important;
			}

			.fc-event-time {
				font-size: 0.75rem !important;
				font-weight: 700 !important;
				color: var(--fg-secondary-color) !important;
				line-height: 1.2 !important;
				margin: 0 !important;
			}

			.fc-event-title {
				font-size: 0.8125rem !important;
				font-weight: 600 !important;
				color: var(--fg-default-color) !important;
				line-height: 1.35 !important;
				white-space: normal !important;
				margin: 0 !important;
			}
		}

		// ── DayGrid Events (Month View) ─────────────────────────
		.fc-daygrid-event {
			border-radius: 4px !important;
			padding: 2px 6px !important;
			margin: 2px 0 !important;
			display: flex !important;
			align-items: center !important;
			gap: 4px !important;

			// Clean modern appearance: hide the conflicting default dot
			.fc-daygrid-event-dot {
				display: none !important;
			}

			.fc-event-time {
				font-size: 0.72rem !important;
				font-weight: 700 !important;
				color: var(--fg-secondary-color) !important;
				flex-shrink: 0 !important;
			}

			.fc-event-title {
				font-size: 0.75rem !important;
				font-weight: 500 !important;
				color: var(--fg-default-color) !important;
				overflow: hidden !important;
				text-overflow: ellipsis !important;
				white-space: nowrap !important;
			}
		}

		// ── Month "+more" link ──────────────────────────────────
		.fc-more-link {
			display: inline-flex !important;
			align-items: center !important;
			padding: 2px 7px !important;
			font-size: 0.72rem !important;
			font-weight: 700 !important;
			color: var(--primary-color) !important;
			background-color: rgba(var(--primary-color-rgb) / 0.1) !important;
			border-radius: 6px !important;
			margin: 2px 3px !important;
			text-decoration: none !important;
			cursor: pointer;
			transition: all 0.15s ease;

			&:hover {
				background-color: var(--primary-color) !important;
				color: #ffffff !important;
				transform: translateY(-1px);
				box-shadow: 0 2px 6px rgba(var(--primary-color-rgb) / 0.3);
			}
		}

		// ── More Popover Dialog ─────────────────────────────────
		.fc-popover {
			background: var(--add-surface-raised, #ffffff) !important;
			border: 1px solid var(--border-color) !important;
			border-radius: 14px !important;
			box-shadow: 0 20px 48px -8px rgba(0, 0, 0, 0.22), 0 8px 18px -4px rgba(0, 0, 0, 0.08) !important;
			z-index: 9999 !important;
			overflow: hidden !important;
			min-width: 330px !important;
			max-width: min(420px, 92vw) !important;
			width: 360px !important;
			max-height: min(420px, calc(100vh - 140px)) !important;
			display: flex !important;
			flex-direction: column !important;
			backdrop-filter: blur(12px) !important;

			.fc-popover-header {
				background: var(--bg-secondary-color) !important;
				border-bottom: 1px solid var(--border-color) !important;
				padding: 12px 16px !important;
				display: flex !important;
				align-items: center !important;
				justify-content: space-between !important;
				flex-shrink: 0 !important;

				.fc-popover-title {
					font-size: 0.9375rem !important;
					font-weight: 700 !important;
					color: var(--fg-default-color) !important;
					margin: 0 !important;
					display: flex !important;
					align-items: center !important;
					gap: 6px !important;
					letter-spacing: -0.01em;
				}

				.fc-popover-close {
					cursor: pointer !important;
					width: 26px !important;
					height: 26px !important;
					border-radius: 50% !important;
					display: flex !important;
					align-items: center !important;
					justify-content: center !important;
					opacity: 0.65;
					font-size: 1.25rem !important;
					font-weight: 300 !important;
					font-family: inherit !important;
					line-height: 1 !important;
					color: var(--fg-default-color) !important;
					background: rgba(var(--fg-secondary-color-rgb, 120, 120, 120) / 0.08) !important;
					transition: all 0.15s ease !important;

					&:hover {
						opacity: 1 !important;
						background-color: rgba(var(--error-color-rgb, 239, 68, 68) / 0.15) !important;
						color: var(--error-color, #dc2626) !important;
						transform: scale(1.08);
					}
				}
			}

			.fc-popover-body {
				padding: 10px 12px !important;
				display: flex !important;
				flex-direction: column !important;
				gap: 8px !important;
				background: var(--add-surface-raised, #ffffff) !important;
				max-height: min(320px, calc(100vh - 220px)) !important;
				overflow-y: auto !important;
				overscroll-behavior: contain;
				scrollbar-width: thin !important;
				scrollbar-color: rgba(var(--primary-color-rgb, 14, 165, 233) / 0.3) transparent !important;

				&::-webkit-scrollbar {
					width: 5px !important;
				}

				&::-webkit-scrollbar-track {
					background: transparent !important;
				}

				&::-webkit-scrollbar-thumb {
					background: rgba(var(--primary-color-rgb, 14, 165, 233) / 0.25) !important;
					border-radius: 10px !important;

					&:hover {
						background: rgba(var(--primary-color-rgb, 14, 165, 233) / 0.5) !important;
					}
				}

				.fc-daygrid-event {
					padding: 8px 12px !important;
					margin: 0 !important;
					border-radius: 8px !important;
					display: flex !important;
					align-items: center !important;
					gap: 10px !important;
					border-width: 1px !important;
					border-style: solid !important;
					border-inline-start-width: 4px !important;
					border-inline-start-style: solid !important;
					box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04) !important;
					cursor: pointer !important;
					transition: transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease !important;

					&:hover {
						transform: translateY(-1px) !important;
						box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
						z-index: 2 !important;
					}

					.fc-event-time {
						font-size: 0.75rem !important;
						font-weight: 700 !important;
						padding: 3px 8px !important;
						border-radius: 6px !important;
						flex-shrink: 0 !important;
						line-height: 1.3 !important;
						background-color: rgba(255, 255, 255, 0.7) !important;
						box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04) !important;
					}

					.fc-event-title {
						font-size: 0.8125rem !important;
						font-weight: 600 !important;
						color: var(--fg-default-color) !important;
						overflow: hidden !important;
						text-overflow: ellipsis !important;
						white-space: nowrap !important;
						flex-grow: 1 !important;
						line-height: 1.4 !important;
					}

					&.c-confirmed {
						background-color: rgba(var(--success-color-rgb, 22, 163, 74) / 0.12) !important;
						border-color: rgba(var(--success-color-rgb, 22, 163, 74) / 0.28) !important;
						border-inline-start-color: var(--success-color, #16a34a) !important;

						.fc-event-time {
							background-color: rgba(var(--success-color-rgb, 22, 163, 74) / 0.18) !important;
							color: var(--success-color, #16a34a) !important;
						}

						&:hover {
							background-color: rgba(var(--success-color-rgb, 22, 163, 74) / 0.2) !important;
						}
					}

					&.c-pending {
						background-color: rgba(var(--warning-color-rgb, 202, 138, 4) / 0.12) !important;
						border-color: rgba(var(--warning-color-rgb, 202, 138, 4) / 0.28) !important;
						border-inline-start-color: var(--warning-color, #ca8a04) !important;

						.fc-event-time {
							background-color: rgba(var(--warning-color-rgb, 202, 138, 4) / 0.18) !important;
							color: var(--warning-color, #ca8a04) !important;
						}

						&:hover {
							background-color: rgba(var(--warning-color-rgb, 202, 138, 4) / 0.2) !important;
						}
					}

					&.c-rejected {
						background-color: rgba(var(--error-color-rgb, 220, 38, 38) / 0.12) !important;
						border-color: rgba(var(--error-color-rgb, 220, 38, 38) / 0.28) !important;
						border-inline-start-color: var(--error-color, #dc2626) !important;

						.fc-event-time {
							background-color: rgba(var(--error-color-rgb, 220, 38, 38) / 0.18) !important;
							color: var(--error-color, #dc2626) !important;
						}

						&:hover {
							background-color: rgba(var(--error-color-rgb, 220, 38, 38) / 0.2) !important;
						}
					}

					&.c-cancelled {
						background-color: var(--bg-secondary-color) !important;
						border-color: var(--border-color) !important;
						border-inline-start-color: var(--border-color) !important;
						opacity: 0.75 !important;

						.fc-event-time {
							background-color: rgba(0, 0, 0, 0.05) !important;
							color: var(--fg-secondary-color) !important;
						}
					}
				}
			}
		}

		// ── Closed Day Background Events ─────────────────────────
		.fc-bg-event.c-closed {
			background-color: var(--bg-secondary-color);
			opacity: 0.7;

			.fc-event-title {
				font-size: var(--add-font-size-caption, 0.75rem);
				font-style: normal;
				font-weight: var(--add-font-weight-medium, 500);
				color: var(--add-text-muted, var(--fg-secondary-color));
			}
		}

		.fc-daygrid-day.add-day--out-of-window {
			cursor: var(--add-disabled-cursor, not-allowed);

			.fc-daygrid-day-number {
				opacity: var(--add-disabled-opacity, 0.4);
			}
		}

		.fc-daygrid-day.add-day--closed {
			cursor: var(--add-disabled-cursor, not-allowed);

			.fc-daygrid-day-number {
				text-decoration: line-through;
				opacity: var(--add-disabled-opacity, 0.4);
			}
		}
	}
}

/**
 * Filter fields.
 */
.add-filter-field {
	display: flex;
	flex-direction: column;
	gap: var(--add-space-1, 0.25rem);
	inline-size: 13rem;
	max-inline-size: 100%;

	&--wide {
		inline-size: 16rem;
	}
}

.add-filters-reset-row {
	display: flex;
	align-items: center;
}

.add-filters-reset-btn {
	font-size: 0.8125rem;
	font-weight: 500;
	color: var(--fg-secondary-color);
	transition: color 0.15s ease, background-color 0.15s ease;

	&:hover {
		color: var(--primary-color);
	}
}

.add-legend-swatch {
	display: inline-block;
	inline-size: 0.85rem;
	block-size: 0.85rem;
	border-radius: 0.25rem;
	border-inline-start-width: 3px;
	border-inline-start-style: solid;

	&.c-confirmed {
		background-color: rgba(var(--success-color-rgb) / 0.2);
		border-color: var(--success-color);
	}
	&.c-pending {
		background-color: rgba(var(--warning-color-rgb) / 0.2);
		border-color: var(--warning-color);
	}
	&.c-cancelled {
		background-color: var(--bg-secondary-color);
		border-color: var(--border-color);
	}
	&.c-rejected {
		background-color: rgba(var(--error-color-rgb) / 0.2);
		border-color: var(--error-color);
	}
	&.c-closed {
		background-color: var(--bg-secondary-color);
		border-color: var(--border-color);
		opacity: 0.7;
	}
}

/**
 * The slot grid and chips in the Create Booking modal.
 */
.add-slot-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(105px, 1fr));
	gap: 8px;
	max-height: 260px;
	overflow-y: auto;
	padding: 2px;
}

.add-slot {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 2px;
	padding: 8px 10px;
	border-radius: var(--border-radius, 8px);
	border: 1.5px solid var(--border-color);
	background: var(--add-surface-raised, #ffffff);
	color: var(--fg-default-color);
	font-size: 0.8125rem;
	font-weight: 600;
	cursor: pointer;
	transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.15s ease;

	&:hover:not(:disabled):not(.add-slot--active) {
		border-color: var(--primary-color);
		background-color: rgba(var(--primary-color-rgb) / 0.06);
		color: var(--primary-color);
		transform: translateY(-1px);
	}

	&:focus-visible {
		outline: 2px solid var(--primary-color);
		outline-offset: 2px;
	}

	&--active {
		background: var(--primary-color) !important;
		border-color: var(--primary-color) !important;
		color: #ffffff !important;
		font-weight: 700;
		box-shadow: 0 2px 8px rgba(var(--primary-color-rgb) / 0.35);

		.add-slot__meta {
			color: rgba(255, 255, 255, 0.85) !important;
		}
	}

	&--taken,
	&:disabled {
		opacity: 0.4 !important;
		cursor: not-allowed !important;
		background: var(--bg-secondary-color) !important;
		border-color: var(--border-color) !important;
		color: var(--fg-secondary-color) !important;
		text-decoration: line-through;

		.add-slot__meta {
			text-decoration: line-through;
		}
	}

	&__meta {
		font-size: 0.72rem;
		font-weight: 400;
		color: var(--fg-secondary-color);
		transition: color 0.15s ease;
	}
}

.add-slot-note {
	font-size: 0.8125rem;
	color: var(--fg-secondary-color);
	margin: 0;
	padding: 8px 12px;
	background: var(--bg-secondary-color);
	border-radius: 6px;
}

.add-slot-counts {
	font-size: 0.8125rem;
	color: var(--fg-secondary-color);
	margin: 0;

	&--hint {
		font-size: 0.75rem;
		opacity: 0.8;
	}

	&--selected {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		padding: 10px 14px;
		border-radius: 8px;
		background-color: rgba(var(--primary-color-rgb) / 0.1);
		border: 1px solid rgba(var(--primary-color-rgb) / 0.25);
		color: var(--primary-color);
	}
}

.add-slot-warning {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	padding: 8px 12px;
	border-radius: 8px;
	background-color: rgba(var(--warning-color-rgb) / 0.12);
	border: 1px solid rgba(var(--warning-color-rgb) / 0.3);
	color: var(--warning-color);
	font-weight: 600;
	font-size: 0.8125rem;
	margin: 0;
}
</style>

<style lang="scss">
/* Global styles for FullCalendar Popover Dialog (in case portaled to body) */
.fc-popover {
	background: var(--add-surface-raised, #ffffff) !important;
	border: 1px solid var(--border-color) !important;
	border-radius: 14px !important;
	box-shadow: 0 20px 48px -8px rgba(0, 0, 0, 0.22), 0 8px 18px -4px rgba(0, 0, 0, 0.08) !important;
	z-index: 9999 !important;
	overflow: hidden !important;
	min-width: 330px !important;
	max-width: min(420px, 92vw) !important;
	width: 360px !important;
	max-height: min(420px, calc(100vh - 140px)) !important;
	display: flex !important;
	flex-direction: column !important;
	backdrop-filter: blur(12px) !important;

	.fc-popover-header {
		background: var(--bg-secondary-color) !important;
		border-bottom: 1px solid var(--border-color) !important;
		padding: 12px 16px !important;
		display: flex !important;
		align-items: center !important;
		justify-content: space-between !important;
		flex-shrink: 0 !important;

		.fc-popover-title {
			font-size: 0.9375rem !important;
			font-weight: 700 !important;
			color: var(--fg-default-color) !important;
			margin: 0 !important;
			display: flex !important;
			align-items: center !important;
			gap: 6px !important;
			letter-spacing: -0.01em;
		}

		.fc-popover-close {
			cursor: pointer !important;
			width: 26px !important;
			height: 26px !important;
			border-radius: 50% !important;
			display: flex !important;
			align-items: center !important;
			justify-content: center !important;
			opacity: 0.65;
			font-size: 1.25rem !important;
			font-weight: 300 !important;
			font-family: inherit !important;
			line-height: 1 !important;
			color: var(--fg-default-color) !important;
			background: rgba(var(--fg-secondary-color-rgb, 120, 120, 120) / 0.08) !important;
			transition: all 0.15s ease !important;

			&:hover {
				opacity: 1 !important;
				background-color: rgba(var(--error-color-rgb, 239, 68, 68) / 0.15) !important;
				color: var(--error-color, #dc2626) !important;
				transform: scale(1.08);
			}
		}
	}

	.fc-popover-body {
		padding: 10px 12px !important;
		display: flex !important;
		flex-direction: column !important;
		gap: 8px !important;
		background: var(--add-surface-raised, #ffffff) !important;
		max-height: min(320px, calc(100vh - 220px)) !important;
		overflow-y: auto !important;
		overscroll-behavior: contain;
		scrollbar-width: thin !important;
		scrollbar-color: rgba(var(--primary-color-rgb, 14, 165, 233) / 0.3) transparent !important;

		&::-webkit-scrollbar {
			width: 5px !important;
		}

		&::-webkit-scrollbar-track {
			background: transparent !important;
		}

		&::-webkit-scrollbar-thumb {
			background: rgba(var(--primary-color-rgb, 14, 165, 233) / 0.25) !important;
			border-radius: 10px !important;

			&:hover {
				background: rgba(var(--primary-color-rgb, 14, 165, 233) / 0.5) !important;
			}
		}

		.fc-daygrid-event {
			padding: 8px 12px !important;
			margin: 0 !important;
			border-radius: 8px !important;
			display: flex !important;
			align-items: center !important;
			gap: 10px !important;
			border-width: 1px !important;
			border-style: solid !important;
			border-inline-start-width: 4px !important;
			border-inline-start-style: solid !important;
			box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04) !important;
			cursor: pointer !important;
			transition: transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease !important;

			&:hover {
				transform: translateY(-1px) !important;
				box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
				z-index: 2 !important;
			}

			.fc-event-time {
				font-size: 0.75rem !important;
				font-weight: 700 !important;
				padding: 3px 8px !important;
				border-radius: 6px !important;
				flex-shrink: 0 !important;
				line-height: 1.3 !important;
				background-color: rgba(255, 255, 255, 0.7) !important;
				box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04) !important;
			}

			.fc-event-title {
				font-size: 0.8125rem !important;
				font-weight: 600 !important;
				color: var(--fg-default-color) !important;
				overflow: hidden !important;
				text-overflow: ellipsis !important;
				white-space: nowrap !important;
				flex-grow: 1 !important;
				line-height: 1.4 !important;
			}

			&.c-confirmed {
				background-color: rgba(var(--success-color-rgb, 22, 163, 74) / 0.12) !important;
				border-color: rgba(var(--success-color-rgb, 22, 163, 74) / 0.28) !important;
				border-inline-start-color: var(--success-color, #16a34a) !important;

				.fc-event-time {
					background-color: rgba(var(--success-color-rgb, 22, 163, 74) / 0.18) !important;
					color: var(--success-color, #16a34a) !important;
				}

				&:hover {
					background-color: rgba(var(--success-color-rgb, 22, 163, 74) / 0.2) !important;
				}
			}

			&.c-pending {
				background-color: rgba(var(--warning-color-rgb, 202, 138, 4) / 0.12) !important;
				border-color: rgba(var(--warning-color-rgb, 202, 138, 4) / 0.28) !important;
				border-inline-start-color: var(--warning-color, #ca8a04) !important;

				.fc-event-time {
					background-color: rgba(var(--warning-color-rgb, 202, 138, 4) / 0.18) !important;
					color: var(--warning-color, #ca8a04) !important;
				}

				&:hover {
					background-color: rgba(var(--warning-color-rgb, 202, 138, 4) / 0.2) !important;
				}
			}

			&.c-rejected {
				background-color: rgba(var(--error-color-rgb, 220, 38, 38) / 0.12) !important;
				border-color: rgba(var(--error-color-rgb, 220, 38, 38) / 0.28) !important;
				border-inline-start-color: var(--error-color, #dc2626) !important;

				.fc-event-time {
					background-color: rgba(var(--error-color-rgb, 220, 38, 38) / 0.18) !important;
					color: var(--error-color, #dc2626) !important;
				}

				&:hover {
					background-color: rgba(var(--error-color-rgb, 220, 38, 38) / 0.2) !important;
				}
			}

			&.c-cancelled {
				background-color: var(--bg-secondary-color) !important;
				border-color: var(--border-color) !important;
				border-inline-start-color: var(--border-color) !important;
				opacity: 0.75 !important;

				.fc-event-time {
					background-color: rgba(0, 0, 0, 0.05) !important;
					color: var(--fg-secondary-color) !important;
				}
			}
		}
	}
}

.theme-dark .fc-popover {
	background: var(--bg-default-color, #1e1e24) !important;
	box-shadow: 0 20px 48px -8px rgba(0, 0, 0, 0.55), 0 8px 24px -4px rgba(0, 0, 0, 0.35) !important;

	.fc-popover-header {
		background: var(--bg-secondary-color, #26262e) !important;
	}

	.fc-popover-body {
		background: var(--bg-default-color, #1e1e24) !important;

		.fc-daygrid-event .fc-event-time {
			background-color: rgba(0, 0, 0, 0.25) !important;
		}
	}
}
</style>
