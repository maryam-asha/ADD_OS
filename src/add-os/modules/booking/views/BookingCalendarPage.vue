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
					<label class="flex flex-col gap-1">
						<span class="text-xs">{{ t("bookingCalendar.filters.spaceType") }}</span>
						<n-select
							v-model:value="spaceType"
							class="w-52"
							clearable
							:options="spaceTypeOptions"
							:placeholder="t('bookingCalendar.filters.allSpaceTypes')"
						/>
					</label>
					<label class="flex flex-col gap-1">
						<span class="text-xs">{{ t("bookingCalendar.filters.space") }}</span>
						<n-select
							v-model:value="spaceId"
							class="w-56"
							clearable
							:options="spaceOptions"
							:placeholder="t('bookingCalendar.filters.allSpaces')"
						/>
					</label>
				</div>

				<div class="flex flex-wrap items-center gap-6">
					<div v-for="total in totalsSummary" :key="total.key" class="flex flex-col">
						<span class="text-xs">{{ t(`bookingCalendar.totals.${total.key}`) }}</span>
						<span class="text-lg font-semibold">{{ total.value }}</span>
					</div>
				</div>
			</div>

			<div v-if="branchHours" class="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
				<span class="font-medium">{{ branchHours.title }}</span>
				<span>{{ branchHours.hours ?? t("bookingCalendar.hours.closedToday") }}</span>
				<span v-if="branchHours.days_label">{{ branchHours.days_label }}</span>
				<span>{{ branchHours.timezone_note }}</span>
			</div>
		</n-card>

		<n-card>
			<n-spin :show="isLoading">
				<div class="add-calendar-wrap">
					<FullCalendar ref="refCalendar" :options="calendarOptions" />
				</div>

				<div class="mt-4 flex flex-wrap items-center gap-4 text-xs">
					<span class="font-medium">{{ t("bookingCalendar.legend.title") }}</span>
					<span v-for="status in LEGEND_STATUSES" :key="status" class="flex items-center gap-2">
						<span class="add-legend-swatch" :class="`c-${status}`" />
						{{ t(`allBookings.status.${status}`) }}
					</span>
					<span class="flex items-center gap-2">
						<span class="add-legend-swatch c-closed" />
						{{ t("bookingCalendar.legend.closed") }}
					</span>
				</div>
			</n-spin>
		</n-card>

		<!-- Booking detail -->
		<n-modal
			v-model:show="detailVisible"
			preset="card"
			class="max-w-md"
			:title="t('bookingCalendar.detail.title')"
		>
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
					The start time is chosen from the slots the server says exist,
					never typed. A free-form clock lets an operator enter 14:07 on
					a space with 30-minute slots and learn it was wrong only from
					the 422 — and it cannot show that 14:00 is already taken.
				-->
				<n-form-item :label="t('bookingCalendar.create.start')">
					<div class="flex w-full flex-col gap-2">
						<n-spin :show="isLoadingSlots" :size="14">
							<div v-if="slotsBanner" class="add-slot-note">{{ slotsBanner }}</div>

							<div v-else-if="slots.length > 0" class="add-slot-grid">
								<!--
									A taken slot stays visible and disabled rather than
									being dropped: "2pm is booked" and "2pm does not
									exist here" are different facts, and an operator
									needs to tell them apart.
								-->
								<button
									v-for="slot in slots"
									:key="slot.start_time"
									type="button"
									class="add-slot"
									:class="{
										'add-slot--active': createForm.start === slot.start_time,
										'add-slot--taken': !slot.is_available
									}"
									:disabled="!slot.is_available"
									:title="slot.reason ?? undefined"
									:aria-pressed="createForm.start === slot.start_time"
									@click="selectSlot(slot)"
								>
									{{ slot.label }}
								</button>
							</div>

							<div v-else-if="!isLoadingSlots" class="add-slot-note">
								{{ t("bookingCalendar.create.noSlots") }}
							</div>
						</n-spin>

						<p v-if="slotCountsNote" class="add-slot-counts">{{ slotCountsNote }}</p>
					</div>
				</n-form-item>

				<!--
					Durations come from the server priced and pre-judged. An option
					that cannot be booked is shown disabled WITH its reason rather
					than hidden, so "why is 1.5h missing" is never a question.
				-->
				<n-form-item v-if="createForm.start" :label="t('bookingCalendar.create.duration')">
					<div class="flex w-full flex-col gap-2">
						<n-spin :show="isLoadingQuote" :size="14">
							<div v-if="durations.length > 0" class="add-slot-grid">
								<button
									v-for="option in durations"
									:key="option.minutes"
									type="button"
									class="add-slot"
									:class="{
										'add-slot--active': createForm.durationMinutes === option.minutes,
										'add-slot--taken': !option.available
									}"
									:disabled="!option.available"
									:title="option.reason ?? undefined"
									:aria-pressed="createForm.durationMinutes === option.minutes"
									@click="createForm.durationMinutes = option.minutes"
								>
									<span>{{ option.label }}</span>
									<span class="add-slot__meta">{{ option.end_time }}</span>
								</button>
							</div>
						</n-spin>

						<p v-if="selectedDuration" class="add-slot-counts">
							{{ t("bookingCalendar.create.endsAt", { time: selectedDuration.end_time }) }}
							· {{ formatNumber(selectedDuration.points) }} {{ t("bookingCalendar.create.points") }}
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
import type { AvailabilitySlot, DurationOption } from "@/add-os/modules/booking/types/availability"
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
import { spaceTypeLabel } from "@/add-os/modules/booking/config/space-type-label"
import { SPACE_TYPES } from "@/add-os/modules/spatial/types/space"
import { ApiError } from "@/add-os/services/api"
import { getCalendar, getSpaceQuote, getSpaceSlots } from "@/add-os/services/booking-calendar"
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

const refCalendar = ref()
const response = ref<CalendarResponse | null>(null)
const isLoading = ref(true)
const error = ref<ApiError | null>(null)

const spaceType = ref<SpaceType | null>(null)
const spaceId = ref<number | null>(null)

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
		if (closedEverywhere && spaceCount > 0) {
			out.push({ start: date, allDay: true, display: "background", classNames: ["c-closed"] })
		}
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
	dateClick(info) {
		openCreate({ date: info.dateStr.slice(0, 10) })
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
	/** A `start_time` from the server's own slot list, never typed. */
	start: "" as string,
	durationMinutes: null as number | null,
	note: ""
})

const slots = ref<AvailabilitySlot[]>([])
const isLoadingSlots = ref(false)
const slotsBanner = ref<string | null>(null)

const durations = ref<DurationOption[]>([])
const isLoadingQuote = ref(false)

const selectedDuration = computed(
	() => durations.value.find(option => option.minutes === createForm.value.durationMinutes) ?? null
)

/**
 * How many of the day's slots are free, so an operator can see at a glance
 * that a day is busy rather than inferring it from greyed chips.
 */
const slotCountsNote = computed(() => {
	if (slots.value.length === 0) return null
	const available = slots.value.filter(slot => slot.is_available).length
	return t("bookingCalendar.create.slotCounts", { available, total: slots.value.length })
})

/**
 * Days the calendar itself reports closed for every space are not offerable.
 * This mirrors the closed-day shading rather than recomputing openness: the
 * response is the only thing that knows about exceptions and holidays.
 */
function isDateDisabled(timestamp: number): boolean {
	const date = toIsoDate(new Date(timestamp))
	const resources = response.value?.resources ?? []
	if (resources.length === 0) return false
	return resources.every(resource => resource.days.find(day => day.date === date)?.state === "closed")
}

const memberOptions = computed<SelectOption[]>(() =>
	members.value.map(member => ({ label: `${member.name} · ${member.phone}`, value: member.id }))
)

/**
 * Nothing about availability is judged here any more.
 *
 * The form can only submit a start the server listed as available and a
 * duration it marked bookable, so the client no longer needs an opinion about
 * granularity, minimum duration, overlap, buffer or back-dating — it renders
 * the server's verdict instead of forming its own. That verdict can still go
 * stale between load and submit, which is why the POST re-checks under a row
 * lock and its 422 is still shown verbatim.
 */
const canSubmit = computed(
	() =>
		createForm.value.user_id !== null
		&& createForm.value.space_id !== null
		&& createForm.value.start !== ""
		&& selectedDuration.value !== null
		&& selectedDuration.value.available
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
	createForm.value.date = prefill?.date ?? toIsoDate(new Date())
	createForm.value.start = ""
	createForm.value.durationMinutes = null
	durations.value = []

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
 * The slots for the chosen space and date.
 *
 * Re-fetched on every change of either, because a slot list is only true for
 * one space on one day — reusing yesterday's would offer windows that are
 * already gone.
 */
async function loadSlots(): Promise<void> {
	const { space_id: spaceId, date } = createForm.value
	if (spaceId === null || !date) {
		slots.value = []
		slotsBanner.value = null
		return
	}

	isLoadingSlots.value = true
	slotsBanner.value = null
	try {
		const response_ = await getSpaceSlots(spaceId, date)
		slots.value = response_.data
		// A closed day carries the server's own banner, reason included.
		slotsBanner.value = response_.closed_banner?.text ?? null
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		slots.value = []
		slotsBanner.value = caught.data?.message ?? t("bookingCalendar.create.slotsError")
	} finally {
		isLoadingSlots.value = false
	}
}

/** The duration ladder for the chosen start, priced by the server. */
async function loadQuote(): Promise<void> {
	const { space_id: spaceId, date, start } = createForm.value
	if (spaceId === null || !date || !start) {
		durations.value = []
		return
	}

	isLoadingQuote.value = true
	try {
		// Wall-clock, matching what the create endpoint expects.
		const response_ = await getSpaceQuote(spaceId, `${date} ${start}`)
		durations.value = response_.durations
		// Land on the shortest bookable duration rather than none, so a
		// booking is one click away once a time is picked.
		createForm.value.durationMinutes = response_.durations.find(option => option.available)?.minutes ?? null
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		durations.value = []
		createForm.value.durationMinutes = null
	} finally {
		isLoadingQuote.value = false
	}
}

function selectSlot(slot: AvailabilitySlot): void {
	if (!slot.is_available) return
	createForm.value.start = slot.start_time
}

// A new space or date invalidates both the slots and any chosen time: the
// window that was free on Tuesday says nothing about Wednesday.
watch(
	() => [createForm.value.space_id, createForm.value.date],
	() => {
		createForm.value.start = ""
		createForm.value.durationMinutes = null
		durations.value = []
		if (createVisible.value) void loadSlots()
	}
)

watch(() => createForm.value.start, () => void loadQuote())

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
			// The end comes from the duration the server priced, not from
			// adding minutes here: a duration crossing a midday closure ends
			// somewhere only the server knows.
			start_at: `${createForm.value.date} ${createForm.value.start}`,
			end_at: `${createForm.value.date} ${(selectedDuration.value as DurationOption).end_time}`,
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
 * Only what FullCalendar itself needs to sit inside a Naive card and to colour
 * a booking by status. Every value is a theme variable the theme store injects
 * onto <html>, so this follows the brand without a second palette.
 */
.add-booking-calendar {
	.add-calendar-wrap {
		min-height: 30rem;
	}

	:deep(.fc) {
		--fc-border-color: var(--border-color);
		--fc-page-bg-color: transparent;
		--fc-neutral-bg-color: var(--bg-secondary-color);
		--fc-today-bg-color: rgba(var(--primary-color-rgb) / 0.08);

		.fc-toolbar-title {
			font-size: 1.125rem;
			font-weight: 600;
		}

		.fc-button {
			background-color: var(--bg-secondary-color);
			border-color: var(--border-color);
			color: var(--fg-default-color);
			box-shadow: none !important;
			text-transform: capitalize;

			&:hover,
			&.fc-button-active {
				background-color: rgba(var(--primary-color-rgb) / 0.15);
				border-color: var(--primary-color);
				color: var(--primary-color);
			}
		}

		.fc-daygrid-day-number,
		.fc-col-header-cell-cushion {
			text-decoration: none;
		}

		// Status carries a border as well as a fill: colour alone is not a
		// signal anyone can rely on, and `warning` against `danger` is the
		// tightest pair in this palette.
		.fc-event.styled {
			border-inline-start-width: 3px;
			border-inline-start-style: solid;
			padding-inline: 2px;
			cursor: pointer;

			&.c-confirmed {
				background-color: rgba(var(--success-color-rgb) / 0.12);
				border-color: var(--success-color);
				color: var(--fg-default-color);
			}

			&.c-pending {
				background-color: rgba(var(--warning-color-rgb) / 0.14);
				border-color: var(--warning-color);
				color: var(--fg-default-color);
			}

			&.c-cancelled {
				background-color: var(--bg-secondary-color);
				border-color: var(--border-color);
				color: var(--fg-secondary-color);
				text-decoration: line-through;
			}

			&.c-rejected {
				background-color: rgba(var(--error-color-rgb) / 0.12);
				border-color: var(--error-color);
				color: var(--fg-default-color);
			}
		}

		.fc-bg-event.c-closed {
			background-color: var(--bg-secondary-color);
			opacity: 0.65;
		}
	}
}

.add-legend-swatch {
	display: inline-block;
	inline-size: 0.75rem;
	block-size: 0.75rem;
	border-radius: 0.25rem;
	border-inline-start-width: 3px;
	border-inline-start-style: solid;

	&.c-confirmed {
		background-color: rgba(var(--success-color-rgb) / 0.12);
		border-color: var(--success-color);
	}
	&.c-pending {
		background-color: rgba(var(--warning-color-rgb) / 0.14);
		border-color: var(--warning-color);
	}
	&.c-cancelled {
		background-color: var(--bg-secondary-color);
		border-color: var(--border-color);
	}
	&.c-rejected {
		background-color: rgba(var(--error-color-rgb) / 0.12);
		border-color: var(--error-color);
	}
	&.c-closed {
		background-color: var(--bg-secondary-color);
		border-color: var(--border-color);
		opacity: 0.65;
	}
}

/**
 * The slot and duration chips.
 *
 * A chip is a real button, not a styled div: it must be reachable by keyboard
 * and announce its pressed state, since choosing a time is the whole task of
 * this form.
 *
 * A taken slot stays visible and disabled rather than being removed. "2pm is
 * booked" and "2pm is not a slot here" are different facts, and an operator
 * telling a member why they cannot have 2pm needs the first one.
 */
.add-slot-grid {
	display: flex;
	flex-wrap: wrap;
	gap: var(--add-space-3);
}

.add-slot {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--add-space-1);
	padding: var(--add-space-3) var(--add-space-5);
	border-radius: var(--add-radius-default);
	border: var(--add-border-width-hairline) solid var(--add-border);
	background: var(--add-surface-raised);
	color: var(--add-text-primary);
	font-size: var(--add-font-size-caption);
	font-weight: var(--add-font-weight-medium);
	cursor: pointer;
	transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;

	&:hover:not(:disabled):not(.add-slot--active) {
		border-color: var(--add-primary);
		color: var(--add-primary-text);
	}

	&:focus-visible {
		outline: var(--add-border-width-emphasis) solid var(--add-focus-ring-inner);
		outline-offset: var(--add-space-1);
	}

	// Fill AND weight, never fill alone — colour is the one signal a
	// deuteranopic viewer loses.
	&--active {
		background: var(--add-primary);
		border-color: var(--add-primary);
		color: var(--add-primary-on);
		font-weight: var(--add-font-weight-bold);
	}

	// Struck through as well as dimmed, so "unavailable" survives being read
	// in greyscale or by someone who cannot separate the two greys.
	&--taken {
		opacity: var(--add-disabled-opacity);
		cursor: var(--add-disabled-cursor);
		text-decoration: line-through;
	}

	&__meta {
		font-size: var(--add-font-size-caption);
		font-weight: var(--add-font-weight-regular);
		opacity: 0.8;
	}
}

.add-slot-note,
.add-slot-counts {
	font-size: var(--add-font-size-caption);
	color: var(--add-text-muted);
	margin: var(--add-space-0);
}
</style>
