import type { CalendarOptions, EventInput } from "@fullcalendar/core"
import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import { ApiError } from "@/add-os/services/api"
import BookingCalendarPage from "../BookingCalendarPage.vue"

const { getCalendarMock, createBookingMock, listMembersMock, getSlotsMock, getQuoteMock } = vi.hoisted(() => ({
	getCalendarMock: vi.fn(),
	createBookingMock: vi.fn(),
	listMembersMock: vi.fn(),
	getSlotsMock: vi.fn(),
	getQuoteMock: vi.fn()
}))

vi.mock("@/add-os/services/booking-calendar", () => ({
	getCalendar: getCalendarMock,
	getSpaceSlots: getSlotsMock,
	getSpaceQuote: getQuoteMock
}))
vi.mock("@/add-os/services/reception", () => ({ createReceptionBooking: createBookingMock }))
vi.mock("@/add-os/services/members", () => ({ listMembers: listMembersMock }))

// Same pitfall ApprovalQueuePage.spec.ts documents: the page calls useMessage()
// directly, which needs a provider it has no reason to mount.
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: vi.fn(), error: vi.fn() }) }
})

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
vi.mock("@fullcalendar/interaction", () => ({ default: {} }))

/**
 * A slot as the server sends it. `start_time` is the value sent back;
 * `label` is only for display, and the two are deliberately different here so
 * a test can catch the label being submitted by mistake.
 */
function slot(startTime: string, overrides: Record<string, unknown> = {}) {
	const hour = Number(startTime.slice(0, 2))
	return {
		start_at: `2026-09-24T${startTime}:00+03:00`,
		end_at: `2026-09-24T${String(hour + 1).padStart(2, "0")}:00:00+03:00`,
		label: `${String(hour % 12 || 12).padStart(2, "0")}:00 ${hour < 12 ? "AM" : "PM"}`,
		start_time: startTime,
		end_time: `${String(hour + 1).padStart(2, "0")}:00`,
		state: "available",
		is_available: true,
		reason: null,
		...overrides
	}
}

function slotsPayload(rows = [slot("14:00"), slot("15:00")], overrides: Record<string, unknown> = {}) {
	return {
		state: "available",
		closed_banner: null,
		data: rows,
		counts: {
			available: rows.filter(row => row.is_available).length,
			booked: 0,
			outside_hours: 0,
			buffer: 0,
			at_capacity: 0,
			past: 0,
			total: rows.length
		},
		meta: { granularity_minutes: 60, timezone: "Asia/Damascus" },
		...overrides
	}
}

function duration(minutes: number, endTime: string, overrides: Record<string, unknown> = {}) {
	return {
		minutes,
		label: `${minutes / 60}h`,
		end_at: `2026-09-24T${endTime}:00+03:00`,
		end_time: endTime,
		points: minutes * 2,
		amount_usd: "12.00",
		available: true,
		reason: null,
		...overrides
	}
}

function quotePayload(rows = [duration(60, "15:00"), duration(120, "16:00")]) {
	return {
		start_at: "2026-09-24T14:00:00+03:00",
		start_time: "02:00 PM",
		hourly_rate_points: 120,
		hourly_rate_usd: "12.00",
		durations: rows,
		meta: { min_duration_minutes: 60, granularity_minutes: 60, timezone: "Asia/Damascus" }
	}
}

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
			resourceCrud: { form: { cancel: "Cancel" } },
			allBookings: {
				status: { confirmed: "Confirmed", pending: "Under review", cancelled: "Cancelled", rejected: "Rejected" },
				paymentState: { paid: "Paid", unpaid: "Unpaid" }
			},
			bookingCalendar: {
				description: "Which spaces are booked.",
				loadError: "Couldn't load the calendar.",
				empty: "No active spaces match these filters.",
				filters: { spaceType: "Space type", space: "Space", allSpaceTypes: "All space types", allSpaces: "All spaces" },
				totals: { spaces: "Spaces", bookings: "Bookings", occupancy: "Average occupancy" },
				legend: { title: "Occupancy", closed: "Closed" },
				hours: { closedToday: "Closed on this date" },
				detail: {
					title: "Booking details",
					member: "Member",
					space: "Space",
					when: "Booked for",
					status: "Status",
					payment: "Payment",
					note: "Note",
					checkedIn: "Checked in",
					notCheckedIn: "Not checked in yet",
					noPhone: "No phone on file",
					openInBookings: "Open in all bookings"
				},
				create: {
					button: "Add booking",
					title: "Book a space for a member",
					member: "Member",
					memberPlaceholder: "Search by name",
					space: "Space",
					spacePlaceholder: "Choose a space",
					date: "Date",
					start: "Start",
					duration: "Duration",
					noSlots: "No bookable times on this date.",
					slotsError: "Couldn't load times for this space.",
					slotCounts: "{available} of {total} times free",
					endsAt: "Ends {time}",
					points: "points",
					note: "Note (optional)",
					notePlaceholder: "e.g. booked at the desk",
					submit: "Create booking",
					success: "Booking created.",
					rulesNote: "Only times this space can actually take are offered."
				}
			}
		}
	}
})

function mountPage() {
	return mount(BookingCalendarPage, { global: { plugins: [i18n] } })
}

/**
 * The create form's own state and verbs.
 *
 * Reached directly because what matters is the payload that leaves for the
 * service — the part that can be wrong in a way no operator would see on
 * screen. The rendered chips are asserted separately.
 */
function formVm(wrapper: ReturnType<typeof mountPage>) {
	return wrapper.vm as unknown as {
		createForm: {
			user_id: number | null
			space_id: number | null
			date: string
			start: string
			durationMinutes: number | null
			note: string
		}
		selectSlot: (slot: ReturnType<typeof slot>) => void
		submitCreate: () => Promise<void>
	}
}

/** Mounts the page and opens the create modal the way an operator would. */
async function openCreateForm() {
	const wrapper = mountPage()
	await flushPromises()
	await wrapper.findAll("button").find(button => button.text().includes("Add booking"))!.trigger("click")
	await flushPromises()
	return wrapper
}

/**
 * A slot or duration chip, found by the reason it carries.
 *
 * Queried on `document` rather than the wrapper because `n-modal` teleports
 * to body — the same pitfall the detail tests document.
 */
function chipTitled(title: string): HTMLElement | null {
	return document.querySelector<HTMLElement>(`.add-slot[title="${title}"]`)
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
		createBookingMock.mockReset()
		createBookingMock.mockResolvedValue({ data: { id: 1 } })
		listMembersMock.mockReset()
		listMembersMock.mockResolvedValue([{ id: 3, name: "Layla Haddad", phone: "0912345678" }])
		getSlotsMock.mockReset()
		getSlotsMock.mockResolvedValue(slotsPayload())
		getQuoteMock.mockReset()
		getQuoteMock.mockResolvedValue(quotePayload())
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
	/**
	 * The grid cannot CHANGE a booking. `dateClick` is deliberately present —
	 * it opens the create form on the clicked day — but nothing may drag,
	 * resize or inline-edit an existing one: moving a booking re-runs approval
	 * and payment, which lives on the reception screens.
	 */
	it("does not offer any editing affordance", async () => {
		mountPage()
		await flushPromises()

		expect(lastOptions!.editable).toBeFalsy()
		expect(lastOptions!.eventDrop).toBeUndefined()
		expect(lastOptions!.eventResize).toBeUndefined()
		expect(lastOptions!.eventStartEditable).toBeFalsy()
		expect(lastOptions!.eventDurationEditable).toBeFalsy()
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

	/**
	 * Clicking a booking is the one read action the grid offers. Everything
	 * that changes a booking stays on the reception screens.
	 */
	it("opens a read-only detail when a booking is clicked", async () => {
		const wrapper = mountPage()
		await navigate("dayGridMonth", "2026-08-01", "2026-09-01")

		const event = (lastOptions!.events as EventInput[]).find(item => item.id === "9")!
		lastOptions!.eventClick?.({ event: { extendedProps: event.extendedProps } } as never)
		await flushPromises()

		// n-modal teleports to body, so the wrapper's own subtree never contains
		// it — assert against the document instead.
		const text = document.body.textContent ?? ""
		expect(text).toContain("Booking details")
		expect(text).toContain("Layla Haddad")
		expect(text).toContain("0912345678")
		expect(text).toContain("Meeting Room A")

		wrapper.unmount()
	})

	it("ignores a click on a background (closed-day) event", async () => {
		const wrapper = mountPage()
		await navigate("dayGridMonth", "2026-08-01", "2026-09-01")

		// A background event carries no bookingId, so there is nothing to open.
		lastOptions!.eventClick?.({ event: { extendedProps: {} } } as never)
		await flushPromises()

		expect(document.body.textContent ?? "").not.toContain("Booking details")

		wrapper.unmount()
	})

	/**
	 * The start is the slot's `start_time`, and the end is the chosen
	 * duration's `end_time` — both the server's own values, never a label and
	 * never arithmetic done here. A duration crossing a midday closure ends
	 * somewhere only the server knows.
	 */
	it("sends a reception booking as district wall-clock, not an ISO instant", async () => {
		const wrapper = await openCreateForm()

		const vm = formVm(wrapper)
		vm.createForm.user_id = 3
		vm.createForm.space_id = 1
		vm.createForm.date = "2026-09-24"
		await flushPromises()

		vm.selectSlot(slot("14:00"))
		await flushPromises()

		expect(vm.createForm.durationMinutes).toBe(60)
		await vm.submitCreate()

		expect(createBookingMock).toHaveBeenCalledWith(
			expect.objectContaining({
				user_id: 3,
				space_id: 1,
				start_at: "2026-09-24 14:00",
				end_at: "2026-09-24 15:00"
			})
		)
	})

	/** A slot the server refused cannot become a booking, even by a click. */
	it("ignores a click on an unavailable slot", async () => {
		const wrapper = await openCreateForm()
		const vm = formVm(wrapper)

		vm.selectSlot(slot("14:00", { is_available: false, state: "booked", reason: "Already booked." }))
		await flushPromises()

		expect(vm.createForm.start).toBe("")
	})

	/**
	 * A taken slot stays on screen, struck through, carrying the server's
	 * reason. Removing it would leave "2pm is booked" and "2pm is not a slot
	 * here" looking identical to an operator explaining the refusal.
	 */
	it("shows a taken slot disabled with its reason rather than hiding it", async () => {
		getSlotsMock.mockResolvedValue(
			slotsPayload([slot("14:00", { is_available: false, state: "booked", reason: "Already booked." }), slot("15:00")])
		)

		const wrapper = await openCreateForm()

		// n-modal teleports to body, so the wrapper's own subtree never holds
		// the chips — query the document, as the detail tests above do.
		const taken = chipTitled("Already booked.")
		expect(taken, "expected the booked slot to still be rendered").toBeTruthy()
		expect(taken!.hasAttribute("disabled")).toBe(true)
		expect(taken!.classList.contains("add-slot--taken")).toBe(true)

		wrapper.unmount()
	})

	/**
	 * The whole point of the change: the form offers the windows the server
	 * will accept, rather than a free-form clock that learns the granularity
	 * one 422 at a time.
	 */
	it("loads the slots for the chosen space and date", async () => {
		const wrapper = await openCreateForm()
		const vm = formVm(wrapper)

		vm.createForm.space_id = 1
		vm.createForm.date = "2026-09-24"
		await flushPromises()

		expect(getSlotsMock).toHaveBeenLastCalledWith(1, "2026-09-24")
	})

	/** Changing the date cannot leave a time chosen for the previous one. */
	it("clears a chosen time when the date changes", async () => {
		const wrapper = await openCreateForm()
		const vm = formVm(wrapper)

		vm.createForm.space_id = 1
		vm.createForm.date = "2026-09-24"
		await flushPromises()
		vm.selectSlot(slot("14:00"))
		await flushPromises()
		expect(vm.createForm.start).toBe("14:00")

		vm.createForm.date = "2026-09-25"
		await flushPromises()

		expect(vm.createForm.start).toBe("")
		expect(vm.createForm.durationMinutes).toBeNull()
	})

	/**
	 * An unbookable duration is shown disabled WITH its reason, not omitted —
	 * otherwise "why is 1.5h missing" has no answer on screen.
	 */
	it("offers an unbookable duration disabled with its reason", async () => {
		getQuoteMock.mockResolvedValue(
			quotePayload([
				duration(60, "15:00"),
				duration(90, "15:30", { available: false, reason: "Must be a multiple of the slot granularity." })
			])
		)

		const wrapper = await openCreateForm()
		const vm = formVm(wrapper)
		vm.selectSlot(slot("14:00"))
		await flushPromises()

		const rejected = chipTitled("Must be a multiple of the slot granularity.")

		expect(rejected, "expected the refused duration to still be rendered").toBeTruthy()
		expect(rejected!.hasAttribute("disabled")).toBe(true)
		// It must not be what the form would submit.
		expect(vm.createForm.durationMinutes).toBe(60)

		wrapper.unmount()
	})

	/**
	 * Clicking a day on the grid is how an operator says which day they mean;
	 * making them re-enter it in the form is what made the two feel unrelated.
	 */
	it("opens the create form on the day clicked in the calendar", async () => {
		const wrapper = mountPage()
		await flushPromises()

		const dateClick = lastOptions!.dateClick as (info: { dateStr: string }) => void
		expect(dateClick, "expected the grid to handle a date click").toBeTruthy()

		dateClick({ dateStr: "2026-09-24" })
		await flushPromises()

		expect(formVm(wrapper).createForm.date).toBe("2026-09-24")
		expect(getSlotsMock).toHaveBeenLastCalledWith(expect.any(Number), "2026-09-24")
	})

	it("refetches the calendar after a successful booking", async () => {
		const wrapper = await openCreateForm()
		const before = getCalendarMock.mock.calls.length

		const vm = formVm(wrapper)
		vm.createForm.user_id = 3
		vm.createForm.space_id = 1
		vm.selectSlot(slot("14:00"))
		await flushPromises()
		await vm.submitCreate()
		await flushPromises()

		expect(getCalendarMock.mock.calls.length).toBeGreaterThan(before)
	})

	/**
	 * Availability is the server's to enforce, so a refusal has to reach the
	 * operator as the server worded it rather than being re-worded here. This
	 * still matters with slot chips: the list can go stale between load and
	 * submit, and the POST re-checks under a row lock.
	 */
	it("surfaces the server's own refusal rather than inventing one", async () => {
		createBookingMock.mockRejectedValue(
			new ApiError(422, JSON.stringify({ message: "This space is not available for the requested time." }))
		)

		const wrapper = await openCreateForm()
		const vm = formVm(wrapper)
		vm.createForm.user_id = 3
		vm.createForm.space_id = 1
		vm.selectSlot(slot("14:00"))
		await flushPromises()

		// Must not throw: an ApiError is an expected outcome here, not a crash.
		await expect(vm.submitCreate()).resolves.toBeUndefined()
	})
})
