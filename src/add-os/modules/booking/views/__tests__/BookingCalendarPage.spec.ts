import type { CalendarOptions, EventInput } from "@fullcalendar/core"
import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import { ApiError } from "@/add-os/services/api"
import BookingCalendarPage from "../BookingCalendarPage.vue"

const { getCalendarMock } = vi.hoisted(() => ({ getCalendarMock: vi.fn() }))

vi.mock("@/add-os/services/booking-calendar", () => ({ getCalendar: getCalendarMock }))

/**
 * FullCalendar renders to a real DOM and runs its own layout on mount, which is
 * noise in a unit test and slow. Stubbing it keeps the assertions on the part
 * this page actually owns: the options it builds, the events it maps, and the
 * range it asks the server for when the user navigates.
 *
 * `datesSet` is captured so a test can drive navigation the way the library
 * would, rather than reaching into component internals.
 */
let lastOptions: CalendarOptions | null = null

vi.mock("@fullcalendar/vue3", () => ({
	default: {
		name: "FullCalendar",
		props: ["options"],
		setup(props: { options: CalendarOptions }) {
			// Read inside the render function, not once in setup: `options` is a
			// computed on the page, so a snapshot taken at setup would never see
			// the events that arrive with the first response.
			return () => {
				lastOptions = props.options
				return null
			}
		}
	}
}))

vi.mock("@fullcalendar/daygrid", () => ({ default: {} }))
vi.mock("@fullcalendar/timegrid", () => ({ default: {} }))
vi.mock("@fullcalendar/list", () => ({ default: {} }))

function day(overrides: Record<string, unknown> = {}) {
	return {
		date: "2026-08-17",
		weekday: "MON",
		day: "17",
		state: "open" as const,
		periods: [{ open_time: "08:00", close_time: "20:00" }],
		occupancy: { booked_minutes: 0, open_minutes: 720, percent: 0 },
		bookings: [],
		...overrides
	}
}

function bookingOn(overrides: Record<string, unknown> = {}) {
	return {
		id: 9,
		start_at: "2026-08-17T14:00:00+03:00",
		end_at: "2026-08-17T15:00:00+03:00",
		start_time: "02:00 PM",
		end_time: "03:00 PM",
		status: "confirmed" as const,
		status_label: "Confirmed",
		payment_state: "paid" as const,
		checked_in_at: null,
		member: { id: 3, name: "Layla Haddad", phone: "0912345678" },
		...overrides
	}
}

function response(overrides: Record<string, unknown> = {}) {
	return {
		view: "month",
		range: { from: "2026-08-17", to: "2026-08-17", timezone: "Asia/Damascus" },
		branch_hours: {
			title: "Main Branch Hours",
			hours: "8:00 AM – 8:00 PM",
			open_time: "08:00",
			close_time: "20:00",
			periods: [{ open_time: "08:00", close_time: "20:00" }],
			days_label: "Sunday – Thursday",
			open_weekdays: ["sunday", "monday"],
			timezone: "Asia/Damascus",
			timezone_label: "GMT+3",
			timezone_note: "All times shown in your local time (GMT+3)"
		},
		resources: [
			{
				space: {
					id: 1,
					title: "Meeting Room A",
					space_type: "room" as const,
					capacity: 6,
					concurrency_ceiling: 1,
					status: "active",
					requires_approval: false
				},
				days: [day({ bookings: [bookingOn()] })]
			}
		],
		totals: { spaces: 1, bookings: 1, occupancy_percent: 8, by_status: { confirmed: 1 } },
		meta: { view: "month", date: "2026-08-17", branch_id: 1, spaces: 1 },
		...overrides
	}
}

const i18n = createI18n({
	legacy: false,
	locale: "en",
	messages: {
		en: {
			nav: { pages: { calendar: "Calendar" } },
			spaces: { spaceType: { co_space: "Co-working space", room: "Room", business: "Business", event_hall: "Event hall" } },
			allBookings: { status: { confirmed: "Confirmed", pending: "Under review", cancelled: "Cancelled", rejected: "Rejected" } },
			bookingCalendar: {
				description: "Which spaces are booked.",
				loadError: "Couldn't load the calendar.",
				empty: "No active spaces match these filters.",
				filters: { spaceType: "Space type", allSpaceTypes: "All space types", allSpaces: "All spaces" },
				totals: { spaces: "Spaces", bookings: "Bookings", occupancy: "Average occupancy" },
				legend: { title: "Occupancy", closed: "Closed" },
				hours: { closedToday: "Closed on this date" }
			}
		}
	}
})

function mountPage() {
	return mount(BookingCalendarPage, { global: { plugins: [i18n] } })
}

/** Drive navigation the way FullCalendar would, through the captured callback. */
async function navigate(viewType: string, start: string, end: string) {
	lastOptions?.datesSet?.({
		view: { type: viewType },
		start: new Date(start),
		end: new Date(end)
	} as never)
	await flushPromises()
}

describe("bookingCalendarPage", () => {
	beforeEach(() => {
		lastOptions = null
		getCalendarMock.mockReset()
		getCalendarMock.mockResolvedValue(response())
	})

	it("mounts a FullCalendar with month, week, day and list views", async () => {
		mountPage()
		await flushPromises()

		expect(lastOptions).toBeTruthy()
		expect(lastOptions!.initialView).toBe("dayGridMonth")
		const toolbarEnd = (lastOptions!.headerToolbar as { end: string }).end
		expect(toolbarEnd).toContain("dayGridMonth")
		expect(toolbarEnd).toContain("timeGridWeek")
		expect(toolbarEnd).toContain("timeGridDay")
		expect(toolbarEnd).toContain("listMonth")
	})

	/**
	 * Read-only by design: acting on a booking happens at the reception desk,
	 * and a calendar that could also drag, resize or create would be a second
	 * place those rules live.
	 */
	it("does not offer any editing affordance", async () => {
		mountPage()
		await flushPromises()

		expect(lastOptions!.editable).toBeFalsy()
		expect(lastOptions!.dateClick).toBeUndefined()
		expect(lastOptions!.eventDrop).toBeUndefined()
	})

	it("maps each booking to an event carrying its space, member and status", async () => {
		mountPage()
		await navigate("dayGridMonth", "2026-08-01", "2026-09-01")

		const events = lastOptions!.events as EventInput[]
		const booking = events.find(event => event.id === "9")

		expect(booking).toBeTruthy()
		expect(booking!.title).toContain("Meeting Room A")
		expect(booking!.title).toContain("Layla Haddad")
		expect(booking!.classNames).toContain("c-confirmed")
		expect(booking!.extendedProps).toMatchObject({ statusLabel: "Confirmed" })
	})

	/**
	 * The range follows whatever the user navigated to, so the visible window
	 * and the data behind it cannot drift apart. The anchor is the midpoint of
	 * the visible range: a month grid's first cell often sits in the previous
	 * month, and sending that would fetch the wrong month.
	 */
	it("refetches for the period the user navigated to", async () => {
		mountPage()
		await flushPromises()

		await navigate("timeGridWeek", "2026-09-06", "2026-09-13")

		expect(getCalendarMock).toHaveBeenLastCalledWith(expect.objectContaining({ view: "week", date: "2026-09-09" }))
	})

	it("treats the list view as a month range", async () => {
		mountPage()
		await navigate("listMonth", "2026-10-01", "2026-11-01")

		expect(getCalendarMock).toHaveBeenLastCalledWith(expect.objectContaining({ view: "month" }))
	})

	/**
	 * One space under maintenance does not shut the branch, so a day is only
	 * shaded closed when every space in view is closed on it.
	 */
	it("shades a day closed only when every space is closed on it", async () => {
		getCalendarMock.mockResolvedValue(
			response({
				resources: [
					{ ...response().resources[0], days: [day({ state: "closed", bookings: [] })] },
					{
						space: { id: 2, title: "Hot Desk", space_type: "co_space" as const, capacity: 4, concurrency_ceiling: 4, status: "active", requires_approval: false },
						days: [day({ state: "open", bookings: [] })]
					}
				]
			})
		)

		mountPage()
		await navigate("dayGridMonth", "2026-08-01", "2026-09-01")

		const background = (lastOptions!.events as EventInput[]).filter(event => event.display === "background")
		expect(background).toHaveLength(0)
	})

	it("shades a day closed when the whole branch is closed", async () => {
		getCalendarMock.mockResolvedValue(
			response({
				resources: [{ ...response().resources[0], days: [day({ state: "closed", bookings: [] })] }]
			})
		)

		mountPage()
		await navigate("dayGridMonth", "2026-08-01", "2026-09-01")

		const background = (lastOptions!.events as EventInput[]).filter(event => event.display === "background")
		expect(background).toHaveLength(1)
		expect(background[0].classNames).toContain("c-closed")
	})

	it("shows the branch hours card from the server, including its derived timezone label", async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.text()).toContain("Main Branch Hours")
		expect(wrapper.text()).toContain("Sunday – Thursday")
		expect(wrapper.text()).toContain("GMT+3")
	})

	it("shows the totals the server computed", async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.text()).toContain("Average occupancy")
		expect(wrapper.text()).toContain("8%")
	})

	it("follows the interface language and direction", async () => {
		mountPage()
		await flushPromises()

		expect(lastOptions!.locale).toBe("en")
		expect(lastOptions!.direction).toBe("ltr")
	})

	it("surfaces a load failure instead of rendering an empty calendar as if it were empty", async () => {
		getCalendarMock.mockRejectedValue(new ApiError(403, JSON.stringify({ message: "Forbidden" })))

		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.text()).toContain("Couldn't load the calendar.")
	})
})
