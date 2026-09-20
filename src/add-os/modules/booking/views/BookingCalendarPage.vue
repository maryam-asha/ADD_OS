<!-- src/add-os/modules/booking/views/BookingCalendarPage.vue -->
<template>
	<div class="add-booking-calendar flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.calendar") }}</h1>
			<p>{{ t("bookingCalendar.description") }}</p>
		</div>

		<n-alert v-if="error" type="error" :title="t('bookingCalendar.loadError')" />

		<n-card>
			<div class="flex flex-wrap items-end justify-between gap-4">
				<div class="flex flex-wrap items-end gap-4">
					<n-select
						v-model:value="spaceType"
						class="w-52"
						size="small"
						clearable
						:options="spaceTypeOptions"
						:placeholder="t('bookingCalendar.filters.allSpaceTypes')"
					/>
					<n-select
						v-model:value="spaceId"
						class="w-56"
						size="small"
						clearable
						:options="spaceOptions"
						:placeholder="t('bookingCalendar.filters.allSpaces')"
					/>
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
	</div>
</template>

<script setup lang="ts">
import type { CalendarApi, CalendarOptions, EventInput } from "@fullcalendar/core"
import type { SelectOption } from "naive-ui"
import type { BookingStatus, CalendarResponse, CalendarView } from "@/add-os/modules/booking/types/calendar"
import type { SpaceType } from "@/add-os/modules/spatial/types/space"
import dayGridPlugin from "@fullcalendar/daygrid"
import listPlugin from "@fullcalendar/list"
import timeGridPlugin from "@fullcalendar/timegrid"
import FullCalendar from "@fullcalendar/vue3"
import { NAlert, NCard, NSelect, NSpin } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { spaceTypeLabel } from "@/add-os/modules/booking/config/space-type-label"
import { SPACE_TYPES } from "@/add-os/modules/spatial/types/space"
import { ApiError } from "@/add-os/services/api"
import { getCalendar } from "@/add-os/services/booking-calendar"
import { formatNumber } from "@/add-os/utils/format"

/**
 * The operations calendar: every booking in the district, on the FullCalendar
 * the template already ships.
 *
 * FullCalendar rather than a hand-built grid, and it is worth saying why the
 * first attempt was wrong: a table of shaded cells answers "how full is this
 * space today" but not "what is actually on at 2pm", which is the question an
 * operator standing at the desk is usually asking. Month, week, day and list
 * views come from the library, and the vendor's own `Apps/Calendars` screen
 * already establishes how it is wired and styled here.
 *
 * `@fullcalendar/*` is imported directly from `node_modules` — it is a
 * dependency of this project, already in `package.json`, not vendor source.
 * Nothing is imported from `src/views/Apps/**`, which stays Category C.
 *
 * Read-only. Every write verb on a booking already lives on the reception
 * screens, and a calendar that could also approve and cancel would be a second
 * place those rules are expressed. This screen answers where the pressure is;
 * acting on it happens at the desk.
 *
 * The server decides the range. `datesSet` reports whichever period the user
 * navigated to, and the fetch follows it — so the visible window and the data
 * behind it can never drift apart.
 */

defineProps<{ titleKey?: string }>()

const { t, locale } = useI18n()

/** The statuses the legend explains, in the order it lists them. */
const LEGEND_STATUSES: readonly BookingStatus[] = ["confirmed", "pending", "cancelled", "rejected"]

/**
 * FullCalendar view name → the `view` this API accepts.
 *
 * `listMonth` maps to `month`: the list is a different rendering of the same
 * month, not a different range.
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
 * which is authoritative — these are never guessed again.
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
 * Space filter options, read off whatever the current response returned rather
 * than fetched separately — the calendar has already named every active space
 * in range, and a second request would only risk disagreeing with it.
 */
const spaceOptions = computed<SelectOption[]>(() =>
	(response.value?.resources ?? []).map(resource => ({
		label: resource.space.title ?? spaceTypeLabel(t, resource.space.space_type),
		value: resource.space.id
	}))
)

/**
 * The response flattened into FullCalendar events.
 *
 * One event per booking, titled with the space it is in and the member who
 * holds it — on a month grid the space is what distinguishes two rows at the
 * same hour. A closed day becomes a background event instead, which is how
 * FullCalendar shades a day without putting a clickable block on it.
 */
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
						statusLabel: booking.status_label,
						spaceName,
						memberName: booking.member.name,
						memberPhone: booking.member.phone,
						paymentState: booking.payment_state
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
			out.push({
				start: date,
				allDay: true,
				display: "background",
				classNames: ["c-closed"]
			})
		}
	}

	return out
})

const calendarOptions = computed<CalendarOptions>(() => ({
	plugins: [dayGridPlugin, timeGridPlugin, listPlugin],
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
	// Read-only: no editable, no dateClick, no eventDrop. Acting on a booking
	// happens at the reception desk.
	events: events.value,
	eventTimeFormat: { hour: "2-digit", minute: "2-digit", meridiem: "short" },
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
</style>
