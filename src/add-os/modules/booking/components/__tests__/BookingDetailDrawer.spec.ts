import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import BookingDetailDrawer from "../BookingDetailDrawer.vue"

const { getBookingMock } = vi.hoisted(() => ({ getBookingMock: vi.fn() }))

vi.mock("@/add-os/services/booking-calendar", () => ({ getBooking: getBookingMock }))

const i18n = createI18n({
	legacy: false,
	locale: "en",
	missingWarn: false,
	fallbackWarn: false,
	messages: {
		en: {
			spaces: { spaceType: { room: "Room" } },
			allBookings: {
				columns: { member: "Member", space: "Space", payment: "Payment" },
				paymentState: { paid: "Paid", unpaid: "Unpaid" },
				paymentSource: { wallet: "Wallet", cash: "Cash" },
				detail: { title: "Booking details", loadError: "Couldn't load this booking.", phone: "Phone", date: "Date", time: "Time", price: "Price", total: "Total", points: "points", progress: "Progress", note: "Note" },
				cancel: { button: "Cancel booking", unavailable: "This booking can no longer be cancelled." }
			}
		}
	}
})

/** What `GET admin/bookings/{id}` answers for a confirmed, wallet-paid room. */
function detail(overrides: Record<string, unknown> = {}) {
	return {
		id: 7,
		space: { id: 1, title: "Meeting Room A", space_type: "room", branch: "Main Branch" },
		member: { id: 3, name: "Layla Haddad", phone: "0912345678" },
		status: "confirmed",
		status_label: "Confirmed",
		payment_state: "paid",
		payment_source: "wallet",
		amount_owed: "10",
		currency: "USD",
		checked_in_at: null,
		checked_out_at: null,
		note: "Projector please",
		created_at: "2026-08-17T05:00:00+00:00",
		discounts: [],
		when: { date: "2026-08-18", start_at: "2026-08-18T10:00:00+03:00", end_at: "2026-08-18T11:00:00+03:00", range: "10:00 AM – 11:00 AM", duration_label: "1 hour" },
		breakdown: {
			lines: [{ key: "base", label: "1 hour × $10.00", points: 100, formatted: "$10.00" }],
			subtotal: { points: 100, amount: "10", formatted: "$10.00" },
			vat: { rate_percent: 0, label: "VAT (0%)", points: 0, amount: "0", formatted: "$0.00" },
			total: { points: 100, amount: "10", formatted: "$10.00" }
		},
		request_status: {
			steps: [
				{ key: "submitted", label: "Submitted", state: "complete", at: "2026-08-17T08:00:00+03:00" },
				{ key: "confirmed", label: "Confirmed", state: "complete", at: "2026-08-17T08:00:00+03:00" }
			],
			rejection_reason: null
		},
		actions: { can_cancel: true, cancel_deadline_at: "2026-08-18T08:00:00+03:00", cancel_note: "Free cancellation up to 2 hours before." },
		...overrides
	}
}

// The drawer's shell teleports; its contents are what is under test.
const stubs = {
	Drawer: { template: "<div><slot /></div>" },
	DrawerContent: { template: "<div><slot /></div>" }
}

function mountDrawer(mayCancel = true) {
	return mount(BookingDetailDrawer, {
		props: { show: true, bookingId: 7, mayCancel },
		global: { plugins: [i18n], stubs }
	})
}

describe("bookingDetailDrawer", () => {
	beforeEach(() => {
		getBookingMock.mockReset()
		getBookingMock.mockResolvedValue({ data: detail() })
	})

	it("shows the booking's member, space, price and progress", async () => {
		const wrapper = mountDrawer()
		await flushPromises()

		expect(getBookingMock).toHaveBeenCalledWith(7)
		const text = wrapper.text()
		expect(text).toContain("Layla Haddad")
		expect(text).toContain("Meeting Room A — Main Branch")
		expect(text).toContain("1 hour × $10.00")
		expect(text).toContain("$10.00 · 100 points")
		expect(text).toContain("Submitted")
		expect(text).toContain("Projector please")
	})

	it("cancels the booking it shows while the server allows it", async () => {
		const wrapper = mountDrawer()
		await flushPromises()

		const button = wrapper.get("[data-test='booking-cancel'] button")
		expect(button.attributes("disabled")).toBeUndefined()
		expect(wrapper.text()).toContain("Free cancellation up to 2 hours before.")

		await button.trigger("click")
		expect(wrapper.emitted("cancel")).toEqual([[7]])
	})

	it("says why it cannot be cancelled once the server refuses", async () => {
		getBookingMock.mockResolvedValue({ data: detail({ actions: { can_cancel: false, cancel_deadline_at: null, cancel_note: "Free cancellation up to 2 hours before." } }) })
		const wrapper = mountDrawer()
		await flushPromises()

		expect(wrapper.get("[data-test='booking-cancel'] button").attributes("disabled")).toBeDefined()
		expect(wrapper.text()).toContain("This booking can no longer be cancelled.")
	})

	it("offers no cancel to an account that may not book, nor on a booking that played out", async () => {
		const withoutPermission = mountDrawer(false)
		await flushPromises()
		expect(withoutPermission.find("[data-test='booking-cancel']").exists()).toBe(false)

		getBookingMock.mockResolvedValue({ data: detail({ status: "completed", status_label: "Completed" }) })
		const completed = mountDrawer()
		await flushPromises()
		expect(completed.find("[data-test='booking-cancel']").exists()).toBe(false)
	})

	it("says so when the booking cannot be loaded", async () => {
		getBookingMock.mockRejectedValue(new Error("boom"))
		const wrapper = mountDrawer()
		await flushPromises()

		expect(wrapper.text()).toContain("Couldn't load this booking.")
	})
})
