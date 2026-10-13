import type { CalendarOptions, EventInput } from "@fullcalendar/core"
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import { ApiError } from "@/add-os/services/api"
import BookingCalendarPage from "../BookingCalendarPage.vue"

const { getCalendarMock, createBookingMock, quoteBookingMock, listMembersMock, getSlotsMock } = vi.hoisted(() => ({
	getCalendarMock: vi.fn(),
	createBookingMock: vi.fn(),
	quoteBookingMock: vi.fn(),
	listMembersMock: vi.fn(),
	getSlotsMock: vi.fn()
}))

vi.mock("@/add-os/services/booking-calendar", () => ({
	getCalendar: getCalendarMock,
	getSpaceSlots: getSlotsMock
}))
vi.mock("@/add-os/services/reception", () => ({ createReceptionBooking: createBookingMock, quoteReceptionBooking: quoteBookingMock }))

/** Two hours at 12 points: 24 points, $2.40, and a wallet of `balance`. */
function quotePayload(balance = 100) {
	return {
		minutes: 120,
		hourly_rate_points: 12,
		total_points: 24,
		breakdown: { lines: [{ key: "base", label: "2h × 12", points: 24 }], total: { points: 24, amount: "2.40", formatted: "$2.40" } },
		amounts: [{ currency: "USD", value: "2.40" }, { currency: "SYP", value: "33216.02" }],
		wallets: [{ owner_type: "user", owner_id: 3, owner_label: null, usable_balance: balance, sufficient: balance >= 24 }]
	}
}
vi.mock("@/add-os/services/members", () => ({ listMembers: listMembersMock }))

// The co-working seats panel has its own spec (CoworkingPoolPanel.spec.ts);
// here it is only a child the page mounts.
vi.mock("@/add-os/modules/booking/components/CoworkingPoolPanel.vue", () => ({
	default: { name: "CoworkingPoolPanel", render: () => null }
}))

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

/** "14:00" → "02:00 PM": the server's 12-hour form. */
function twelveHour(hour: number): string {
	return `${String(hour % 12 || 12).padStart(2, "0")}:00 ${hour < 12 ? "AM" : "PM"}`
}

/**
 * One hour-long cell as the server sends it: `start_time` / `end_time` in
 * 12-hour "02:00 PM", the one format that is both shown and sent back. Called
 * with the 24-hour hour ("14:00") only so the tests read easily.
 */
function slot(startTime: string, overrides: Record<string, unknown> = {}) {
	const hour = Number(startTime.slice(0, 2))
	return {
		start_time: twelveHour(hour),
		end_time: twelveHour(hour + 1),
		state: "available",
		is_available: true,
		...overrides
	}
}

function slotsPayload(rows = [slot("14:00"), slot("15:00"), slot("16:00")], overrides: Record<string, unknown> = {}) {
	return {
		date: "2026-09-24",
		state: "available",
		closed_banner: null,
		slots: rows,
		counts: {
			available: rows.filter(row => row.is_available).length,
			booked: rows.filter(row => !row.is_available).length,
			total: rows.length
		},
		meta: { granularity_minutes: 60, timezone: "Asia/Damascus" },
		...overrides
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
		checked_out_at: null,
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
			days_label: "Saturday – Friday",
			// Every day, so a test's date is only refused for the reason it
			// sets up; the closed-weekday test narrows this.
			open_weekdays: ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"],
			upcoming_closures: [] as { date: string, reason: string | null }[],
			timezone: "Asia/Damascus",
			timezone_label: "GMT+3",
			timezone_note: "All times shown in your local time (GMT+3)"
		},
		booking_window: { min_duration_minutes: 60, min_notice_minutes: 0, max_days_ahead: null as number | null },
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

// The formatter reads `currentLocale`, which the app keeps in step with
// vue-i18n; here nothing does, so it is set to match by hand — otherwise
// times render "02:00 م" inside an English page.
setCurrentLocale("en")

const i18n = createI18n({
	legacy: false,
	locale: "en",
	messages: {
		en: {
			nav: { pages: { calendar: "Calendar" } },
			spaces: { spaceType: { co_space: "Co-working space", room: "Room", business: "Business", event_hall: "Event hall" } },
			resourceCrud: { form: { cancel: "Cancel" } },
			allBookings: {
				status: {
					confirmed: "Confirmed",
					pending: "Under review",
					completed: "Completed",
					no_show: "Not attended",
					cancelled: "Cancelled",
					rejected: "Rejected"
				},
				paymentState: { paid: "Paid", unpaid: "Unpaid" }
			},
			bookingCalendar: {
				description: "Which spaces are booked.",
				loadError: "Couldn't load the calendar.",
				empty: "No active spaces match these filters.",
				filters: { title: "Filters & Statistics", expand: "Expand", collapse: "Collapse", spaceType: "Space type", space: "Space", allSpaceTypes: "All space types", allSpaces: "All spaces", member: "Member", allMembers: "All members", reset: "Reset filters" },
				totals: { spaces: "Spaces", bookings: "Bookings", occupancy: "Average occupancy" },
				legend: { title: "Occupancy", closed: "Closed", ended: "Ended" },
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
					time: "Time",
					pickHint: "Tap the first time, then the last.",
					selected: "{from} – {to} · {hours}",
					selectedRange: "{from} – {to}",
					selectedDuration: "Duration: {hours}",
					tooShort: "This space takes at least {minimum} — pick a later last time.",
					noSlots: "No bookable times on this date.",
					slotsError: "Couldn't load times for this space.",
					slotCounts: "{available} of {total} times free",
					durationHours: "{hours}h",
					quoteTitle: "Amount due",
					quoteLine: "{hours} × {rate} points an hour",
					quotePoints: "{points} points",
					walletBalance: "{points} points available",
					walletShort: "only {points} points, not enough",
					note: "Note (optional)",
					notePlaceholder: "e.g. booked at the desk",
					payment: "Payment",
					paymentWallet: "From the member's wallet (points, now)",
					paymentCashNow: "Cash — collected now (paid)",
					paymentCashLater: "Cash — collect on arrival (unpaid)",
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
			from: string
			to: string
			payment: "wallet" | "cash_now" | "cash_later" | null
			note: string
		}
		canSubmit: boolean
		walletCannotPay: boolean
		selectSlot: (row: ReturnType<typeof slot>) => void
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
 * A slot chip, found by the start time it shows.
 *
 * Queried on `document` rather than the wrapper because `n-modal` teleports
 * to body — the same pitfall the detail tests document.
 */
function chipStarting(startTime: string): HTMLElement | null {
	return [...document.querySelectorAll<HTMLElement>(".add-slot")]
		.find(chip => chip.textContent?.includes(startTime)) ?? null
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

/**
 * The create form makes two requests on open — the plain grid for the space's
 * duration options, then the slots for the chosen length — so a modal left
 * mounted keeps a spinner transition running past the test that opened it.
 * Unmounting every wrapper after each test keeps that out of the next one.
 */
enableAutoUnmount(afterEach)

// Some tests pin the clock to put a date in the past or future; none may leak.
afterEach(() => {
	vi.useRealTimers()
})

describe("bookingCalendarPage", () => {
	beforeEach(() => {
		lastOptions = null
		getCalendarMock.mockReset()
		getCalendarMock.mockResolvedValue(response())
		createBookingMock.mockReset()
		createBookingMock.mockResolvedValue({ data: { id: 1 } })
		quoteBookingMock.mockReset()
		quoteBookingMock.mockResolvedValue(quotePayload())
		listMembersMock.mockReset()
		listMembersMock.mockResolvedValue([{ id: 3, name: "Layla Haddad", phone: "0912345678" }])
		getSlotsMock.mockReset()
		getSlotsMock.mockResolvedValue(slotsPayload())
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
		// Before the fixture booking ends, so it still reads as confirmed.
		vi.useFakeTimers({ toFake: ["Date"] })
		vi.setSystemTime(new Date("2026-08-17T09:00:00+03:00"))
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
	 * The server has no "ended" status; the calendar marks a confirmed or
	 * pending booking ended once its end time has gone by, and keeps the
	 * server's own status in the detail's status row.
	 */
	describe("a booking whose time has passed", () => {
		it.each([
			["a minute before it ends", "2026-08-17T14:59:00+03:00", "c-confirmed"],
			["the moment it ends", "2026-08-17T15:00:00+03:00", "c-ended"]
		])("draws it right %s", async (_when, instant, expected) => {
			vi.useFakeTimers({ toFake: ["Date"] })
			vi.setSystemTime(new Date(instant))
			mountPage()
			await navigate("dayGridMonth", "2026-08-01", "2026-09-01")

			expect((lastOptions!.events as EventInput[]).find(event => event.id === "9")!.classNames).toContain(expected)
		})

		/**
		 * Once the server has given a booking its outcome, the calendar draws
		 * that outcome — `ended` is only for a live booking the server has not
		 * caught up with yet.
		 */
		it.each([
			["completed", "Completed", "c-completed"],
			["no_show", "Not attended", "c-no_show"]
		])("draws a %s booking as its outcome, never as ended", async (status, statusLabel, expected) => {
			getCalendarMock.mockResolvedValue(
				response({
					resources: [{ ...response().resources[0], days: [day({ bookings: [bookingOn({ status, status_label: statusLabel })] })] }]
				})
			)
			vi.useFakeTimers({ toFake: ["Date"] })
			vi.setSystemTime(new Date("2026-08-18T09:00:00+03:00"))
			mountPage()
			await navigate("dayGridMonth", "2026-08-01", "2026-09-01")

			const classNames = (lastOptions!.events as EventInput[]).find(event => event.id === "9")!.classNames
			expect(classNames).toContain(expected)
			expect(classNames).not.toContain("c-ended")
		})

		it("marks a past pending booking ended too", async () => {
			getCalendarMock.mockResolvedValue(
				response({
					resources: [{ ...response().resources[0], days: [day({ bookings: [bookingOn({ status: "pending", status_label: "Under review" })] })] }]
				})
			)
			vi.useFakeTimers({ toFake: ["Date"] })
			vi.setSystemTime(new Date("2026-08-18T09:00:00+03:00"))
			mountPage()
			await navigate("dayGridMonth", "2026-08-01", "2026-09-01")

			expect((lastOptions!.events as EventInput[]).find(event => event.id === "9")!.classNames).toContain("c-ended")
		})

		it("leaves a past cancelled booking cancelled", async () => {
			getCalendarMock.mockResolvedValue(
				response({
					resources: [{ ...response().resources[0], days: [day({ bookings: [bookingOn({ status: "cancelled", status_label: "Cancelled" })] })] }]
				})
			)
			vi.useFakeTimers({ toFake: ["Date"] })
			vi.setSystemTime(new Date("2026-08-18T09:00:00+03:00"))
			mountPage()
			await navigate("dayGridMonth", "2026-08-01", "2026-09-01")

			expect((lastOptions!.events as EventInput[]).find(event => event.id === "9")!.classNames).toContain("c-cancelled")
		})

		it("shows Ended in the detail and the legend, keeping the server's status in the status row", async () => {
			vi.useFakeTimers({ toFake: ["Date"] })
			vi.setSystemTime(new Date("2026-08-18T09:00:00+03:00"))
			const wrapper = mountPage()
			await navigate("dayGridMonth", "2026-08-01", "2026-09-01")
			expect(wrapper.text()).toContain("Ended")

			const event = (lastOptions!.events as EventInput[]).find(item => item.id === "9")!
			lastOptions!.eventClick?.({ event: { extendedProps: event.extendedProps } } as never)
			await flushPromises()

			const tags = [...document.body.querySelectorAll(".add-detail-modal .n-tag")].map(tag => tag.textContent?.trim())
			expect(tags).toContain("Ended")
			expect(tags).toContain("Confirmed")

			wrapper.unmount()
		})
	})

	/**
	 * The range follows whatever the user navigated to, so the visible window
	 * and the data behind it cannot drift apart. The anchor is the midpoint of
	 * the visible range: a month grid's first cell often sits in the previous
	 * month, and sending that would fetch the wrong month.
	 */
	/** One member's bookings: the server narrows the list, the page only asks. */
	it("narrows the calendar to one member's bookings", async () => {
		const wrapper = mountPage()
		await flushPromises()
		const vm = wrapper.vm as unknown as { memberId: number | null, ensureMembers: () => void, hasFilters: boolean }

		vm.ensureMembers()
		await flushPromises()
		expect(listMembersMock).toHaveBeenCalledOnce()

		vm.memberId = 3
		await flushPromises()
		expect(getCalendarMock).toHaveBeenLastCalledWith(expect.objectContaining({ member_id: 3 }))
		expect(vm.hasFilters).toBe(true)

		vm.memberId = null
		await flushPromises()
		expect(getCalendarMock.mock.lastCall![0]).not.toHaveProperty("member_id")
	})

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
		// The filters & statistics section opens collapsed (eee92f1).
		;(wrapper.vm as unknown as { isFiltersExpanded: boolean }).isFiltersExpanded = true
		await flushPromises()

		expect(wrapper.text()).toContain("Main Branch Hours")
		expect(wrapper.text()).toContain("Saturday – Friday")
		expect(wrapper.text()).toContain("GMT+3")
	})

	it("shows the totals the server computed", async () => {
		const wrapper = mountPage()
		await flushPromises()
		// The filters & statistics section opens collapsed (eee92f1).
		;(wrapper.vm as unknown as { isFiltersExpanded: boolean }).isFiltersExpanded = true
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

	/**
	 * "+N" opens our own modal, not FullCalendar's popover: the popover is
	 * anchored to the cell and ran off-screen on a lower row. FullCalendar
	 * opens its popover whenever the handler returns nothing, so the handler
	 * must return the current view.
	 */
	it("opens the day's bookings in a modal from +N, in start order, and suppresses the popover", async () => {
		const wrapper = mountPage()
		await navigate("dayGridMonth", "2026-08-01", "2026-09-01")

		const event = (lastOptions!.events as EventInput[]).find(item => item.id === "9")!
		const later = event.extendedProps as Record<string, unknown>
		const earlier = { ...later, bookingId: 10, memberName: "Omar Early", startAt: "2000-01-01T08:00:00+03:00", endAt: "2000-01-01T09:00:00+03:00" }
		const moreLinkClick = lastOptions!.moreLinkClick as (info: unknown) => unknown

		const action = moreLinkClick({
			date: new Date(2026, 7, 15),
			allSegs: [{ event: { extendedProps: later } }, { event: { extendedProps: earlier } }, { event: { extendedProps: {} } }],
			view: { type: "dayGridMonth" }
		})
		await flushPromises()

		expect(action).toBe("dayGridMonth")
		const rows = [...document.body.querySelectorAll(".add-day-list__item")]
		// The background (closed-day) segment carries no booking and is left out.
		expect(rows).toHaveLength(2)
		expect(rows[0].textContent).toContain("Omar Early")
		expect(rows[1].textContent).toContain("Layla Haddad")

		// A row swaps the list for that booking's detail.
		;(rows[1] as HTMLButtonElement).click()
		await flushPromises()
		expect(document.body.textContent ?? "").toContain("Booking details")
		expect(document.body.querySelectorAll(".add-day-list__item")).toHaveLength(0)

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
	 * The start is the first cell's `start_time` and the end is the last cell's
	 * `end_time` — both the server's own values, never arithmetic done here.
	 * One tap is a run of one cell.
	 */
	it("sends a reception booking as district wall-clock, not an ISO instant", async () => {
		const wrapper = await openCreateForm()

		const vm = formVm(wrapper)
		vm.createForm.user_id = 3
		vm.createForm.payment = "cash_later"
		vm.createForm.space_id = 1
		vm.createForm.date = "2026-09-24"
		await flushPromises()

		vm.selectSlot(slot("14:00"))
		await flushPromises()

		await vm.submitCreate()

		expect(createBookingMock).toHaveBeenCalledWith(
			expect.objectContaining({
				user_id: 3,
				space_id: 1,
				start_at: "2026-09-24 02:00 PM",
				end_at: "2026-09-24 03:00 PM"
			})
		)
	})

	/** A cell the server refused cannot become part of a booking, even by a click. */
	it("ignores a click on an unavailable slot", async () => {
		const wrapper = await openCreateForm()
		const vm = formVm(wrapper)

		vm.selectSlot(slot("14:00", { is_available: false, state: "booked" }))
		await flushPromises()

		expect(vm.createForm.from).toBe("")
	})

	/**
	 * A taken cell stays on screen, struck through. Removing it would leave
	 * "2pm is booked" and "2pm is not a slot here" looking identical to an
	 * operator explaining the refusal.
	 */
	it("shows a taken slot disabled rather than hiding it", async () => {
		getSlotsMock.mockResolvedValue(
			slotsPayload([slot("14:00", { is_available: false, state: "booked" }), slot("15:00")])
		)

		const wrapper = await openCreateForm()

		// n-modal teleports to body, so the wrapper's own subtree never holds
		// the chips — query the document, as the detail tests above do.
		const taken = chipStarting("02:00 PM")
		expect(taken, "expected the booked slot to still be rendered").toBeTruthy()
		expect(taken!.hasAttribute("disabled")).toBe(true)
		expect(taken!.classList.contains("add-slot--taken")).toBe(true)

		wrapper.unmount()
	})

	/**
	 * The form offers the cells the server will accept, rather than a free-form
	 * clock that learns the granularity one 422 at a time — for the space and
	 * date alone: there is no duration to ask with.
	 */
	it("loads the slots for the chosen space and date", async () => {
		const wrapper = await openCreateForm()
		const vm = formVm(wrapper)

		vm.createForm.space_id = 1
		vm.createForm.date = "2026-09-24"
		await flushPromises()

		expect(getSlotsMock).toHaveBeenLastCalledWith(1, "2026-09-24")
	})

	/** Changing the date cannot leave a run chosen for the previous one. */
	it("clears a chosen time when the date changes", async () => {
		const wrapper = await openCreateForm()
		const vm = formVm(wrapper)

		vm.createForm.space_id = 1
		vm.createForm.date = "2026-09-24"
		await flushPromises()
		vm.selectSlot(slot("14:00"))
		await flushPromises()
		expect(vm.createForm.from).toBe("02:00 PM")

		vm.createForm.date = "2026-09-25"
		await flushPromises()

		expect(vm.createForm.from).toBe("")
		expect(vm.createForm.to).toBe("")
		expect(getSlotsMock).toHaveBeenLastCalledWith(1, "2026-09-25")
	})

	/**
	 * A booking is a run of cells, first to last — the same as the member
	 * app. The first tap starts it, a later tap ends it, and it is booked
	 * whole: from the first cell's start to the last cell's end.
	 */
	it("picks a run from its first to its last cell and books it whole", async () => {
		const wrapper = await openCreateForm()
		const vm = formVm(wrapper)
		vm.createForm.user_id = 3
		vm.createForm.payment = "cash_later"
		vm.createForm.space_id = 1
		vm.createForm.date = "2026-09-24"
		await flushPromises()

		vm.selectSlot(slot("14:00"))
		vm.selectSlot(slot("16:00"))
		await flushPromises()

		expect(vm.createForm.from).toBe("02:00 PM")
		expect(vm.createForm.to).toBe("04:00 PM")
		// Every cell of the run reads as chosen, the middle one included.
		const chosen = Array.from(document.querySelectorAll<HTMLElement>(".add-slot--active")).map(chip => chip.textContent?.trim())
		// Each chip shows its start and end as the server sent them, `HH:mm`.
		expect(chosen.slice(-3)).toEqual(["02:00 PM03:00 PM", "03:00 PM04:00 PM", "04:00 PM05:00 PM"])

		await vm.submitCreate()
		expect(createBookingMock).toHaveBeenCalledWith(
			expect.objectContaining({ start_at: "2026-09-24 02:00 PM", end_at: "2026-09-24 05:00 PM" })
		)
	})

	/**
	 * Across noon: 12-hour times sort wrongly as text ("01:00 PM" before
	 * "11:00 AM"), so the run is ordered by the cells' positions, and its
	 * length comes from the instants.
	 */
	it("picks a run across noon", async () => {
		getSlotsMock.mockResolvedValue(slotsPayload([slot("11:00"), slot("12:00"), slot("13:00")]))
		const wrapper = await openCreateForm()
		const vm = formVm(wrapper)
		vm.createForm.user_id = 3
		vm.createForm.payment = "cash_later"
		vm.createForm.space_id = 1
		vm.createForm.date = "2026-09-24"
		await flushPromises()

		vm.selectSlot(slot("11:00"))
		vm.selectSlot(slot("13:00"))
		await flushPromises()

		expect(vm.createForm.from).toBe("11:00 AM")
		expect(vm.createForm.to).toBe("01:00 PM")
		expect(document.body.textContent ?? "").toContain("11:00 AM – 02:00 PM · 3h")

		await vm.submitCreate()
		expect(createBookingMock).toHaveBeenCalledWith(
			expect.objectContaining({ start_at: "2026-09-24 11:00 AM", end_at: "2026-09-24 02:00 PM" })
		)
	})

	/**
	 * A run cannot span a taken cell: tapping past one starts a new run at the
	 * tapped cell rather than booking across someone else's hour.
	 */
	it("starts over when a taken cell lies between the two taps", async () => {
		getSlotsMock.mockResolvedValue(
			slotsPayload([slot("14:00"), slot("15:00", { is_available: false, state: "booked" }), slot("16:00")])
		)
		const wrapper = await openCreateForm()
		const vm = formVm(wrapper)
		vm.createForm.space_id = 1
		vm.createForm.date = "2026-09-24"
		await flushPromises()

		vm.selectSlot(slot("14:00"))
		vm.selectSlot(slot("16:00"))
		await flushPromises()

		expect(vm.createForm.from).toBe("04:00 PM")
		expect(vm.createForm.to).toBe("04:00 PM")
	})

	/**
	 * The one rule the form applies itself is the run's length, since the run
	 * is the form's own making: shorter than the space's minimum, it says so
	 * and cannot be sent. The server still checks it on the POST.
	 */
	it("will not send a run shorter than the space's minimum", async () => {
		// Read from the calendar's setup, not from the day's slots.
		getCalendarMock.mockResolvedValue(
			response({ booking_window: { min_duration_minutes: 120, min_notice_minutes: 0, max_days_ahead: null } })
		)
		const wrapper = await openCreateForm()
		const vm = formVm(wrapper)
		vm.createForm.user_id = 3
		vm.createForm.payment = "cash_later"
		vm.createForm.space_id = 1
		vm.createForm.date = "2026-09-24"
		await flushPromises()

		vm.selectSlot(slot("14:00"))
		await flushPromises()
		expect(vm.canSubmit).toBe(false)
		expect(document.body.textContent ?? "").toContain("This space takes at least 2h")

		vm.selectSlot(slot("15:00"))
		await flushPromises()
		expect(vm.canSubmit).toBe(true)

		wrapper.unmount()
	})

	/**
	 * Clicking a day on the grid is how an operator says which day they mean;
	 * making them re-enter it in the form is what made the two feel unrelated.
	 */
	it("opens the create form on the day clicked in the calendar", async () => {
		// Pinned, so the clicked day is not already in the past on the day the
		// suite runs — a past day deliberately opens nothing (see below).
		vi.useFakeTimers({ toFake: ["Date"] })
		vi.setSystemTime(new Date("2026-09-24T09:00:00+03:00"))

		const wrapper = mountPage()
		await flushPromises()

		const dateClick = lastOptions!.dateClick as (info: { dateStr: string }) => void
		expect(dateClick, "expected the grid to handle a date click").toBeTruthy()

		dateClick({ dateStr: "2026-09-24" })
		await flushPromises()

		expect(formVm(wrapper).createForm.date).toBe("2026-09-24")
		expect(getSlotsMock).toHaveBeenLastCalledWith(expect.any(Number), "2026-09-24")
	})

	/**
	 * A past day can never be booked — the server refuses it
	 * (`start_in_the_past`) and marks every slot on it `past` — so offering it
	 * is only a trap. "Today" is the district's today, read from the timezone
	 * the calendar response names, not the browser's: a desk machine on UTC at
	 * 01:30 Damascus time must not still offer yesterday.
	 */
	describe("past dates", () => {
		function localNoon(date: string): number {
			return new Date(`${date}T12:00:00`).getTime()
		}

		it("disables every day before today in the booking form", async () => {
			vi.useFakeTimers({ toFake: ["Date"] })
			vi.setSystemTime(new Date("2026-09-24T09:00:00+03:00"))

			const wrapper = await openCreateForm()
			const vm = wrapper.vm as unknown as { isDateDisabled: (timestamp: number) => boolean }

			expect(vm.isDateDisabled(localNoon("2026-09-23"))).toBe(true)
			expect(vm.isDateDisabled(localNoon("2026-09-24"))).toBe(false)
			expect(vm.isDateDisabled(localNoon("2026-09-25"))).toBe(false)
		})

		it("uses the district's today, not the browser's", async () => {
			vi.useFakeTimers({ toFake: ["Date"] })
			// 22:30 UTC on the 23rd is already 01:30 on the 24th in Damascus.
			vi.setSystemTime(new Date("2026-09-23T22:30:00Z"))

			const wrapper = await openCreateForm()
			const vm = wrapper.vm as unknown as { isDateDisabled: (timestamp: number) => boolean }

			expect(vm.isDateDisabled(localNoon("2026-09-23"))).toBe(true)
			expect(formVm(wrapper).createForm.date).toBe("2026-09-24")
		})

		/**
		 * The date picker navigates to months the calendar has not loaded, so
		 * the closures it refuses come from `branch_hours.upcoming_closures` —
		 * every all-day closure from today on — not from the days in view.
		 */
		it("disables an upcoming closure in a month the calendar has not loaded", async () => {
			vi.useFakeTimers({ toFake: ["Date"] })
			vi.setSystemTime(new Date("2026-09-24T09:00:00+03:00"))
			const base = response()
			getCalendarMock.mockResolvedValue(
				response({
					branch_hours: { ...base.branch_hours, upcoming_closures: [{ date: "2026-10-06", reason: "Public holiday" }] }
				})
			)

			const wrapper = await openCreateForm()
			const vm = wrapper.vm as unknown as { isDateDisabled: (timestamp: number) => boolean }

			expect(vm.isDateDisabled(localNoon("2026-10-06"))).toBe(true)
			expect(vm.isDateDisabled(localNoon("2026-10-07"))).toBe(false)
		})

		/**
		 * A closed day says so on the grid itself — shaded, its number struck
		 * through, the exception's own reason written in the cell — and a click
		 * on it opens nothing, rather than a form whose date is already refused.
		 */
		it("marks an upcoming closure on the grid with its reason and opens nothing on it", async () => {
			vi.useFakeTimers({ toFake: ["Date"] })
			vi.setSystemTime(new Date("2026-09-24T09:00:00+03:00"))
			const base = response()
			getCalendarMock.mockResolvedValue(
				response({
					branch_hours: { ...base.branch_hours, upcoming_closures: [{ date: "2026-09-30", reason: "Labour Day" }] }
				})
			)

			mountPage()
			await flushPromises()
			getSlotsMock.mockClear()

			const closure = (lastOptions!.events as EventInput[]).find(event => event.start === "2026-09-30")
			expect(closure, "expected the closure to be drawn on the grid").toBeTruthy()
			expect(closure!.display).toBe("background")
			expect(closure!.title).toBe("Labour Day")
			expect(closure!.classNames).toContain("c-closed")

			const cellClasses = lastOptions!.dayCellClassNames as (arg: { date: Date }) => string[]
			expect(cellClasses({ date: new Date("2026-09-30T00:00:00") })).toContain("add-day--closed")
			expect(cellClasses({ date: new Date("2026-09-29T00:00:00") })).not.toContain("add-day--closed")

			const dateClick = lastOptions!.dateClick as (info: { dateStr: string }) => void
			dateClick({ dateStr: "2026-09-30" })
			await flushPromises()
			expect(getSlotsMock).not.toHaveBeenCalled()
		})

		it("names a closure with no reason plainly rather than leaving the cell blank", async () => {
			vi.useFakeTimers({ toFake: ["Date"] })
			vi.setSystemTime(new Date("2026-09-24T09:00:00+03:00"))
			const base = response()
			getCalendarMock.mockResolvedValue(
				response({ branch_hours: { ...base.branch_hours, upcoming_closures: [{ date: "2026-09-30", reason: null }] } })
			)

			mountPage()
			await flushPromises()

			const closure = (lastOptions!.events as EventInput[]).find(event => event.start === "2026-09-30")
			expect(closure!.title).toBe("Closed")
		})

		/** "Add booking" on a holiday opens on the next day that can be booked. */
		it("opens the form on the next open day when today is closed", async () => {
			vi.useFakeTimers({ toFake: ["Date"] })
			vi.setSystemTime(new Date("2026-09-30T09:00:00+03:00"))
			const base = response()
			getCalendarMock.mockResolvedValue(
				response({
					branch_hours: {
						...base.branch_hours,
						upcoming_closures: [
							{ date: "2026-09-30", reason: "Labour Day" },
							{ date: "2026-10-01", reason: "Labour Day" }
						]
					}
				})
			)

			const wrapper = await openCreateForm()

			expect(formVm(wrapper).createForm.date).toBe("2026-10-02")
		})

		it("does not open the booking form from a past day on the grid", async () => {
			vi.useFakeTimers({ toFake: ["Date"] })
			vi.setSystemTime(new Date("2026-09-24T09:00:00+03:00"))

			mountPage()
			await flushPromises()
			getSlotsMock.mockClear()

			const dateClick = lastOptions!.dateClick as (info: { dateStr: string }) => void
			dateClick({ dateStr: "2026-09-23" })
			await flushPromises()

			expect(getSlotsMock).not.toHaveBeenCalled()
			expect(document.body.textContent ?? "").not.toContain("Book a space for a member")

			// Today still opens it.
			dateClick({ dateStr: "2026-09-24" })
			await flushPromises()
			expect(getSlotsMock).toHaveBeenCalledWith(expect.any(Number), "2026-09-24")
		})
	})

	/**
	 * The calendar's setup, as the member app builds it from the space details:
	 * a weekday the branch never opens and a date beyond the booking window are
	 * refused by the picker and on the grid alike, before any slots are asked
	 * for.
	 */
	describe("dates outside the setup", () => {
		function localNoon(date: string): number {
			return new Date(`${date}T12:00:00`).getTime()
		}

		it("refuses a weekday the branch never opens, and strikes it through on the grid", async () => {
			vi.useFakeTimers({ toFake: ["Date"] })
			vi.setSystemTime(new Date("2026-09-24T09:00:00+03:00"))
			const base = response()
			// Friday off.
			getCalendarMock.mockResolvedValue(
				response({
					branch_hours: {
						...base.branch_hours,
						open_weekdays: ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday"]
					}
				})
			)

			const wrapper = await openCreateForm()
			const vm = wrapper.vm as unknown as { isDateDisabled: (timestamp: number) => boolean }
			getSlotsMock.mockClear()

			// 2026-09-25 is a Friday.
			expect(vm.isDateDisabled(localNoon("2026-09-25"))).toBe(true)
			expect(vm.isDateDisabled(localNoon("2026-09-26"))).toBe(false)

			const cellClasses = lastOptions!.dayCellClassNames as (arg: { date: Date }) => string[]
			expect(cellClasses({ date: new Date("2026-09-25T00:00:00") })).toContain("add-day--closed")

			const dateClick = lastOptions!.dateClick as (info: { dateStr: string }) => void
			dateClick({ dateStr: "2026-09-25" })
			await flushPromises()
			expect(getSlotsMock).not.toHaveBeenCalled()
		})

		it("refuses a date beyond the booking window, and dims it on the grid", async () => {
			vi.useFakeTimers({ toFake: ["Date"] })
			vi.setSystemTime(new Date("2026-09-24T09:00:00+03:00"))
			getCalendarMock.mockResolvedValue(response({ booking_window: { min_duration_minutes: 60, min_notice_minutes: 0, max_days_ahead: 7 } }))

			const wrapper = await openCreateForm()
			const vm = wrapper.vm as unknown as { isDateDisabled: (timestamp: number) => boolean }

			expect(vm.isDateDisabled(localNoon("2026-10-01"))).toBe(false)
			expect(vm.isDateDisabled(localNoon("2026-10-02"))).toBe(true)

			const cellClasses = lastOptions!.dayCellClassNames as (arg: { date: Date }) => string[]
			expect(cellClasses({ date: new Date("2026-10-02T00:00:00") })).toContain("add-day--out-of-window")
			expect(cellClasses({ date: new Date("2026-10-02T00:00:00") })).not.toContain("add-day--closed")
		})
	})

	/** The desk always names how a booking is paid: nothing goes out without it. */
	it("will not send a booking until a payment is chosen", async () => {
		const wrapper = await openCreateForm()
		const vm = formVm(wrapper)
		vm.createForm.user_id = 3
		vm.createForm.space_id = 1
		vm.createForm.date = "2026-09-24"
		await flushPromises()
		vm.selectSlot(slot("14:00"))
		await flushPromises()

		vm.createForm.payment = null
		expect(vm.canSubmit).toBe(false)
		vm.createForm.payment = "wallet"
		expect(vm.canSubmit).toBe(true)

		wrapper.unmount()
	})

	it.each([
		["wallet", { payment_method: "wallet" }],
		["cash_now", { payment_method: "cash", cash_collected: true }],
		["cash_later", { payment_method: "cash", cash_collected: false }]
	] as const)("sends the %s choice as the server expects it", async (choice, expected) => {
		const wrapper = await openCreateForm()
		const vm = formVm(wrapper)
		vm.createForm.user_id = 3
		vm.createForm.space_id = 1
		vm.createForm.date = "2026-09-24"
		await flushPromises()
		vm.selectSlot(slot("14:00"))
		vm.createForm.payment = choice
		await flushPromises()

		await vm.submitCreate()

		expect(createBookingMock).toHaveBeenLastCalledWith(expect.objectContaining(expected))
		if (choice === "wallet") {
			expect(createBookingMock.mock.lastCall?.[0]).not.toHaveProperty("cash_collected")
		}

		wrapper.unmount()
	})

	/** The desk sees what the member owes — points and money — for the run it picked. */
	it("quotes the chosen run in points and money", async () => {
		const wrapper = await openCreateForm()
		const vm = formVm(wrapper)
		vm.createForm.user_id = 3
		vm.createForm.space_id = 1
		vm.createForm.date = "2026-09-24"
		await flushPromises()
		vm.selectSlot(slot("14:00"))
		vm.selectSlot(slot("15:00"))
		await flushPromises()

		expect(quoteBookingMock).toHaveBeenLastCalledWith({ user_id: 3, space_id: 1, start_at: "2026-09-24 02:00 PM", end_at: "2026-09-24 04:00 PM" })
		const text = document.body.textContent ?? ""
		expect(text).toContain("24 points")
		expect(text).toContain("2.40")
		expect(text).toContain("33,216.02")

		wrapper.unmount()
	})

	/** A wallet that cannot cover the total is not offered: it would come back as a 422. */
	it("will not offer the wallet when no wallet covers the total", async () => {
		quoteBookingMock.mockResolvedValue(quotePayload(10))
		const wrapper = await openCreateForm()
		const vm = formVm(wrapper)
		vm.createForm.user_id = 3
		vm.createForm.space_id = 1
		vm.createForm.date = "2026-09-24"
		vm.createForm.payment = "wallet"
		await flushPromises()
		vm.selectSlot(slot("14:00"))
		await flushPromises()

		expect(vm.walletCannotPay).toBe(true)
		expect(vm.createForm.payment).toBeNull()

		wrapper.unmount()
	})

	it("refetches the calendar after a successful booking", async () => {
		const wrapper = await openCreateForm()
		const before = getCalendarMock.mock.calls.length

		const vm = formVm(wrapper)
		vm.createForm.user_id = 3
		vm.createForm.payment = "cash_later"
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
		vm.createForm.payment = "cash_later"
		vm.createForm.space_id = 1
		vm.selectSlot(slot("14:00"))
		await flushPromises()

		// Must not throw: an ApiError is an expected outcome here, not a crash.
		await expect(vm.submitCreate()).resolves.toBeUndefined()
	})

	it("resets space and space-type filters when the reset button is clicked", async () => {
		const wrapper = mountPage()
		await flushPromises()

		const vm = wrapper.vm as unknown as {
			spaceType: string | null
			spaceId: number | null
			hasFilters: boolean
			resetFilters: () => void
		}

		expect(vm.hasFilters).toBe(false)
		expect(wrapper.find(".add-filters-reset-btn").exists()).toBe(false)

		vm.spaceType = "room"
		vm.spaceId = 1
		await flushPromises()
		// The filters & statistics section opens collapsed (eee92f1).
		;(wrapper.vm as unknown as { isFiltersExpanded: boolean }).isFiltersExpanded = true
		await flushPromises()

		expect(vm.hasFilters).toBe(true)
		expect(wrapper.find(".add-filters-reset-btn").exists()).toBe(true)

		await wrapper.find(".add-filters-reset-btn").trigger("click")
		await flushPromises()

		expect(vm.spaceType).toBeNull()
		expect(vm.spaceId).toBeNull()
		expect(vm.hasFilters).toBe(false)
	})

	it("resets the create booking form when the dialog is closed", async () => {
		const wrapper = await openCreateForm()
		const vm = formVm(wrapper)

		vm.createForm.user_id = 5
		vm.createForm.space_id = 2
		vm.createForm.date = "2026-09-24"
		vm.createForm.from = "02:00 PM"
		vm.createForm.to = "04:00 PM"
		vm.createForm.note = "Previous note"
		await flushPromises()

		// Close dialog
		const createVm = wrapper.vm as unknown as { createVisible: boolean }
		createVm.createVisible = false
		await flushPromises()

		expect(vm.createForm.user_id).toBeNull()
		expect(vm.createForm.space_id).toBeNull()
		expect(vm.createForm.from).toBe("")
		expect(vm.createForm.to).toBe("")
		expect(vm.createForm.note).toBe("")
	})
})
