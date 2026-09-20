import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import { ApiError } from "@/add-os/services/api"
import AllBookingsPage from "../AllBookingsPage.vue"

const { listBookingsMock } = vi.hoisted(() => ({ listBookingsMock: vi.fn() }))

vi.mock("@/add-os/services/booking-calendar", () => ({ listBookings: listBookingsMock }))

function booking(overrides: Record<string, unknown> = {}) {
	return {
		id: 1,
		space: { id: 1, title: "Meeting Room A", space_type: "room" as const, branch: "Main Branch" },
		member: { id: 3, name: "Layla Haddad", phone: "0912345678" },
		start_at: "2026-08-17T11:00:00+00:00",
		end_at: "2026-08-17T12:00:00+00:00",
		status: "pending" as const,
		status_label: "Under review",
		payment_state: "unpaid" as const,
		payment_source: null,
		amount_owed: null,
		currency: null,
		checked_in_at: null,
		checked_out_at: null,
		note: null,
		rejection_reason: null,
		created_at: "2026-08-17T05:00:00+00:00",
		...overrides
	}
}

function pageOf(rows: ReturnType<typeof booking>[], meta: Partial<{ current_page: number; last_page: number; per_page: number; total: number }> = {}) {
	return { data: rows, meta: { current_page: 1, last_page: 1, per_page: 25, total: rows.length, ...meta } }
}

const i18n = createI18n({
	legacy: false,
	locale: "en",
	messages: {
		en: {
			nav: { pages: { allBookings: "All bookings" } },
			spaces: { spaceType: { co_space: "Co-working space", room: "Room", business: "Business", event_hall: "Event hall" } },
			allBookings: {
				description: "Every booking across the district.",
				loadError: "Couldn't load bookings.",
				empty: "No bookings match these filters.",
				filters: {
					search: "Search",
					searchPlaceholder: "Member name or phone",
					status: "Status",
					anyStatus: "Any status",
					paymentState: "Payment",
					anyPaymentState: "Any payment state",
					from: "From",
					to: "To",
					clear: "Clear filters",
					dateRange: "Date range",
					legend: "Filter bookings"
				},
				columns: { member: "Member", space: "Space", when: "Booked for", status: "Status", payment: "Payment", amount: "Amount" },
				status: { confirmed: "Confirmed", pending: "Under review", cancelled: "Cancelled", rejected: "Rejected" },
				paymentState: { paid: "Paid", unpaid: "Unpaid" },
				paymentSource: { wallet: "Wallet", cash: "Cash" },
				notSettled: "Not settled yet",
				resultCount: "bookings"
			}
		}
	}
})

function mountPage() {
	return mount(AllBookingsPage, { global: { plugins: [i18n] } })
}

describe("allBookingsPage", () => {
	beforeEach(() => {
		listBookingsMock.mockReset()
		listBookingsMock.mockResolvedValue(pageOf([booking()]))
	})

	it("renders a row per booking with its member and space", async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.text()).toContain("Layla Haddad")
		expect(wrapper.text()).toContain("Meeting Room A")
		expect(wrapper.text()).toContain("Main Branch")
	})

	/**
	 * `status_label` arrives already translated against the request's `lang`
	 * header. Re-deriving it from the enum would mean two translations of one
	 * value, free to disagree.
	 */
	it("renders the server's status label rather than re-translating the enum", async () => {
		listBookingsMock.mockResolvedValue(pageOf([booking({ status: "confirmed", status_label: "Confirmed by ops" })]))

		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.text()).toContain("Confirmed by ops")
	})

	/**
	 * `amount_owed` is null until checkout. A dash there reads as missing data
	 * on a booking that simply has not happened yet.
	 */
	it("explains an unsettled amount instead of showing a blank cell", async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.text()).toContain("Not settled yet")
	})

	it("shows a settled amount with its currency", async () => {
		listBookingsMock.mockResolvedValue(pageOf([booking({ amount_owed: "12.00", currency: "USD", payment_state: "paid", payment_source: "wallet" })]))

		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.text()).toContain("12.00 USD")
		expect(wrapper.text()).toContain("Wallet")
	})

	/**
	 * Filtering has to reach the server: a client-side filter would search only
	 * the 25 rows on the current page and report "no bookings match" while the
	 * match sat on page three.
	 */
	it("sends the search term to the server", async () => {
		const wrapper = mountPage()
		await flushPromises()

		// The search box is the first text input on the page; the precedent for
		// driving Naive inputs in this suite is a real DOM node, not a component
		// lookup (see LoginPage.spec.ts).
		await wrapper.find("input").setValue("Layla")
		await flushPromises()

		expect(listBookingsMock).toHaveBeenLastCalledWith(expect.objectContaining({ q: "Layla" }))
	})

	/**
	 * Page 3 of an unfiltered list is rarely page 3 of a filtered one. Leaving
	 * the page number alone would show an empty table for a filter that has
	 * results — the failure is silent, which is why it is pinned here.
	 *
	 * The page is moved by clicking the pager's own button rather than by
	 * emitting on the component: `NPagination` is not findable by name in this
	 * environment, and reaching past the rendered control would stop testing
	 * what an operator can actually do.
	 */
	it("returns to page one when a filter changes", async () => {
		listBookingsMock.mockResolvedValue(pageOf([booking()], { last_page: 4 }))

		const wrapper = mountPage()
		await flushPromises()

		const pageThree = wrapper.findAll(".n-pagination-item").find(item => item.text() === "3")
		expect(pageThree, "expected a pager button for page 3").toBeTruthy()
		await pageThree!.trigger("click")
		await flushPromises()
		expect(listBookingsMock).toHaveBeenLastCalledWith(expect.objectContaining({ page: 3 }))

		await wrapper.find("input").setValue("Omar")
		await flushPromises()

		expect(listBookingsMock).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, q: "Omar" }))
	})

	it("hides the pager when there is only one page", async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.find(".n-pagination").exists()).toBe(false)
	})

	it("shows an empty state when nothing matches", async () => {
		listBookingsMock.mockResolvedValue(pageOf([]))

		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.text()).toContain("No bookings match these filters.")
	})

	it("surfaces a load failure", async () => {
		listBookingsMock.mockRejectedValue(new ApiError(403, JSON.stringify({ message: "Forbidden" })))

		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.text()).toContain("Couldn't load bookings.")
	})

	/**
	 * The filters shipped placeholder-only. A placeholder vanishes the moment a
	 * value is chosen — precisely when a filtered list most needs to say what is
	 * filtering it — and in RTL the row rendered as blank pills. Pinned as text
	 * rather than as a class so it keeps testing what an operator can read.
	 */
	it("labels every filter control visibly", async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.text()).toContain("Search")
		expect(wrapper.text()).toContain("Payment")
		expect(wrapper.text()).toContain("Date range")
	})

	/**
	 * Status is a chip row, so all five choices are visible without opening
	 * anything — the filter an operator uses most should not cost a click to
	 * read.
	 */
	it("offers every status as a chip, plus an all-statuses chip", async () => {
		const wrapper = mountPage()
		await flushPromises()

		const chips = wrapper.findAll(".add-chip").map(chip => chip.text())

		expect(chips).toEqual(["Any status", "Confirmed", "Under review", "Cancelled", "Rejected"])
	})

	it("sends the status to the server when its chip is clicked", async () => {
		const wrapper = mountPage()
		await flushPromises()

		const cancelled = wrapper.findAll(".add-chip").find(chip => chip.text() === "Cancelled")
		expect(cancelled, "expected a Cancelled chip").toBeTruthy()
		await cancelled!.trigger("click")
		await flushPromises()

		expect(listBookingsMock).toHaveBeenLastCalledWith(expect.objectContaining({ status: "cancelled" }))
	})

	/**
	 * "All" is the absence of the filter, not a value for it: sending
	 * `status: null` would have the server filter on a status no booking holds.
	 */
	it("drops the status filter entirely when the all-statuses chip is clicked", async () => {
		const wrapper = mountPage()
		await flushPromises()

		const chips = () => wrapper.findAll(".add-chip")
		await chips().find(chip => chip.text() === "Confirmed")!.trigger("click")
		await flushPromises()
		expect(listBookingsMock).toHaveBeenLastCalledWith(expect.objectContaining({ status: "confirmed" }))

		await chips().find(chip => chip.text() === "Any status")!.trigger("click")
		await flushPromises()

		const lastQuery = listBookingsMock.mock.lastCall![0] as Record<string, unknown>
		expect(lastQuery).not.toHaveProperty("status")
	})

	/** The active chip is marked for assistive tech, not by colour alone. */
	it("marks the active status chip as pressed", async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.find(".add-chip[aria-pressed=\"true\"]").text()).toBe("Any status")

		await wrapper.findAll(".add-chip").find(chip => chip.text() === "Rejected")!.trigger("click")
		await flushPromises()

		expect(wrapper.find(".add-chip[aria-pressed=\"true\"]").text()).toBe("Rejected")
	})

	/**
	 * The count is `meta.total` — the total for the current filter, which is the
	 * only count this endpoint returns. Deriving it from the loaded rows would
	 * count 25 and call it the district.
	 */
	it("shows the server's total for the current filter, not the loaded row count", async () => {
		listBookingsMock.mockResolvedValue(pageOf([booking()], { last_page: 15, total: 372 }))

		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.text()).toContain("372")
		expect(wrapper.text()).toContain("bookings")
	})

	/**
	 * An operator who filtered their way into an empty table needs the way back
	 * out, not just the news — and with no filters set there is nothing to clear,
	 * so the button would be a no-op control.
	 */
	it("offers a way out of an empty result only when a filter caused it", async () => {
		listBookingsMock.mockResolvedValue(pageOf([]))

		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.findAll("button").some(b => b.text() === "Clear filters")).toBe(false)

		await wrapper.find("input").setValue("nobody")
		await flushPromises()

		expect(wrapper.findAll("button").some(b => b.text() === "Clear filters")).toBe(true)
	})

	it("clears every filter at once", async () => {
		const wrapper = mountPage()
		await flushPromises()

		await wrapper.find("input").setValue("Layla")
		await flushPromises()
		await wrapper.findAll(".add-chip").find(chip => chip.text() === "Confirmed")!.trigger("click")
		await flushPromises()
		expect(listBookingsMock).toHaveBeenLastCalledWith(expect.objectContaining({ q: "Layla", status: "confirmed" }))

		await wrapper.findAll("button").find(b => b.text().includes("Clear filters"))!.trigger("click")
		await flushPromises()

		expect(listBookingsMock).toHaveBeenLastCalledWith({ page: 1 })
	})
})
