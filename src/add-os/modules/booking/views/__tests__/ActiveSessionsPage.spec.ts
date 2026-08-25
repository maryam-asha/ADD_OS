import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import { ApiError } from "@/add-os/services/api"
import ActiveSessionsPage from "../ActiveSessionsPage.vue"

const { listActiveSessionsMock, checkOutSessionMock, settleSessionPaymentMock, cancelBookingMock, extendBookingMock } = vi.hoisted(() => ({
	listActiveSessionsMock: vi.fn(),
	checkOutSessionMock: vi.fn(),
	settleSessionPaymentMock: vi.fn(),
	cancelBookingMock: vi.fn(),
	extendBookingMock: vi.fn()
}))

vi.mock("@/add-os/services/reception", () => ({
	listActiveSessions: listActiveSessionsMock,
	checkOutSession: checkOutSessionMock,
	settleSessionPayment: settleSessionPaymentMock,
	cancelBooking: cancelBookingMock,
	extendBooking: extendBookingMock
}))

vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return {
		...actual,
		useMessage: () => ({ success: vi.fn(), error: vi.fn() }),
		useDialog: () => ({ warning: vi.fn() })
	}
})

const bookingSession = {
	id: 1,
	type: "booking" as const,
	space_id: 5,
	space_type: "room" as const,
	user_id: 12,
	user_name: "Sara Haddad",
	checked_in_at: "2026-08-25T09:00:00+03:00",
	is_overdue: false
}

const walkinSession = {
	id: 2,
	type: "walkin" as const,
	space_id: 6,
	space_type: "co_space" as const,
	user_id: 13,
	user_name: "Omar Nasri",
	checked_in_at: "2026-08-25T10:00:00+03:00",
	is_overdue: false
}

const i18n = createI18n({
	legacy: false,
	locale: "en",
	messages: {
		en: {
			nav: { pages: { activeSessions: "Active sessions" } },
			spaces: { spaceType: { co_space: "Co-working space", room: "Room", business: "Business", event_hall: "Event hall" } },
			walletTopUps: { paymentMethod: { cash: "Cash", sham: "Sham Cash", mtn: "MTN Cash", syriatel: "Syriatel Cash" } },
			activeSessions: {
				description: "Everyone currently checked in.",
				loadError: "Couldn't load active sessions.",
				empty: "Nobody is checked in right now.",
				refresh: "Refresh",
				overdue: "Overdue",
				onTime: "On time",
				columns: { occupant: "Occupant", space: "Space", type: "Type", checkedInAt: "Checked in", status: "Status", actions: "Actions" },
				type: { booking: "Booking", walkin: "Walk-in" },
				checkOut: {
					button: "Check out",
					title: "Check out session",
					atLabel: "Checked out at",
					futureNotAllowed: "The check-out time cannot be in the future.",
					settleLabel: "Settle payment",
					settleNone: "Don't settle now",
					success: "Session checked out.",
					settleSuccess: "Payment settled."
				},
				extend: {
					button: "Extend",
					title: "Extend booking",
					minutesLabel: "Additional minutes",
					minutesInvalid: "Enter a whole number of minutes, 1 or more.",
					success: "Booking extended."
				},
				cancel: { button: "Cancel booking", confirmTitle: "Cancel this booking?", confirmText: "Cancel booking", success: "Booking cancelled." }
			},
			resourceCrud: {
				form: { submit: "Save", cancel: "Cancel" },
				table: { deleteConfirmCancel: "Keep" },
				mutations: { genericError: "Something went wrong.", permissionError: "No permission." }
			}
		}
	}
})

function mountPage() {
	return mount(ActiveSessionsPage, { global: { plugins: [i18n] }, attachTo: document.body })
}

describe("activeSessionsPage", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		listActiveSessionsMock.mockResolvedValue([bookingSession, walkinSession])
		checkOutSessionMock.mockResolvedValue({ message: "Checked out." })
		settleSessionPaymentMock.mockResolvedValue({ message: "Payment settled." })
		cancelBookingMock.mockResolvedValue({ message: "Cancelled." })
		extendBookingMock.mockResolvedValue({ message: "Extended." })
	})

	it("fetches the live list once on mount, unpaginated", async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(listActiveSessionsMock).toHaveBeenCalledOnce()
		expect(listActiveSessionsMock).toHaveBeenCalledWith(undefined)
		expect(wrapper.vm.rows).toEqual([bookingSession, walkinSession])
		wrapper.unmount()
	})

	it("refetches when the operator asks it to", async () => {
		const wrapper = mountPage()
		await flushPromises()

		await wrapper.find('[aria-label="Refresh"]').trigger("click")
		await flushPromises()

		expect(listActiveSessionsMock).toHaveBeenCalledTimes(2)
		wrapper.unmount()
	})

	/**
	 * The reason this screen exists. `is_overdue` is the backend's
	 * branch-closing-time verdict; the page must show it and must not compute
	 * its own — nothing in this payload carries the branch's closing time.
	 */
	describe("overdue flag", () => {
		it("flags a row the backend marked overdue", async () => {
			listActiveSessionsMock.mockResolvedValue([{ ...bookingSession, is_overdue: true }])
			const wrapper = mountPage()
			await flushPromises()

			expect(wrapper.text()).toContain("Overdue")
			expect(wrapper.text()).not.toContain("On time")
			wrapper.unmount()
		})

		it("does not flag a row the backend left unmarked", async () => {
			listActiveSessionsMock.mockResolvedValue([bookingSession])
			const wrapper = mountPage()
			await flushPromises()

			expect(wrapper.text()).toContain("On time")
			expect(wrapper.text()).not.toContain("Overdue")
			wrapper.unmount()
		})

		/**
		 * Asserted per row, not as a tally. Counting one tag of each kind passes
		 * just as happily when the two are swapped — which is exactly the bug
		 * worth catching, since the flag is only useful if it is on the right
		 * person.
		 */
		it("puts the flag on the overdue row and not on its neighbour", async () => {
			listActiveSessionsMock.mockResolvedValue([{ ...bookingSession, is_overdue: true }, walkinSession])
			const wrapper = mountPage()
			await flushPromises()

			const rows = wrapper.findAll("tbody tr")
			const overdueRow = rows.find(row => row.text().includes(bookingSession.user_name))
			const onTimeRow = rows.find(row => row.text().includes(walkinSession.user_name))

			expect(overdueRow?.text()).toContain("Overdue")
			expect(onTimeRow?.text()).toContain("On time")
			expect(onTimeRow?.text()).not.toContain("Overdue")
			wrapper.unmount()
		})
	})

	/**
	 * Booking-only actions are booking-only in the API, not just in the UI:
	 * the collection has no walk-in cancel and no walk-in extend at all.
	 * Rendering them for a walk-in row would be offering a 404.
	 */
	describe("actions by row type", () => {
		it("offers check-out, extend and cancel on a booking row", async () => {
			listActiveSessionsMock.mockResolvedValue([bookingSession])
			const wrapper = mountPage()
			await flushPromises()

			expect(wrapper.find('[aria-label="Check out"]').exists()).toBe(true)
			expect(wrapper.find('[aria-label="Extend"]').exists()).toBe(true)
			expect(wrapper.find('[aria-label="Cancel booking"]').exists()).toBe(true)
			wrapper.unmount()
		})

		it("offers only check-out on a walk-in row", async () => {
			listActiveSessionsMock.mockResolvedValue([walkinSession])
			const wrapper = mountPage()
			await flushPromises()

			expect(wrapper.find('[aria-label="Check out"]').exists()).toBe(true)
			expect(wrapper.find('[aria-label="Extend"]').exists()).toBe(false)
			expect(wrapper.find('[aria-label="Cancel booking"]').exists()).toBe(false)
			wrapper.unmount()
		})
	})

	describe("check-out", () => {
		it("defaults the time to now", async () => {
			const wrapper = mountPage()
			await flushPromises()

			const before = Date.now()
			wrapper.vm.openCheckOut(bookingSession)

			expect(wrapper.vm.checkOutForm.checked_out_at).toBeGreaterThanOrEqual(before)
			expect(wrapper.vm.checkOutForm.checked_out_at).toBeLessThanOrEqual(Date.now())
			wrapper.unmount()
		})

		it("checks out a booking through the booking arm and refetches", async () => {
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.openCheckOut(bookingSession)
			await wrapper.vm.submitCheckOut()
			await flushPromises()

			expect(checkOutSessionMock).toHaveBeenCalledWith("booking", 1, expect.any(Date))
			expect(listActiveSessionsMock).toHaveBeenCalledTimes(2)
			expect(wrapper.vm.checkOutModalVisible).toBe(false)
			wrapper.unmount()
		})

		it("checks out a walk-in through the walk-in arm", async () => {
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.openCheckOut(walkinSession)
			await wrapper.vm.submitCheckOut()
			await flushPromises()

			expect(checkOutSessionMock).toHaveBeenCalledWith("walkin", 2, expect.any(Date))
			wrapper.unmount()
		})

		/** `before_or_equal:now` server-side — refused here so it never leaves the browser. */
		it("refuses a future check-out time without calling the API", async () => {
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.openCheckOut(bookingSession)
			wrapper.vm.checkOutForm.checked_out_at = Date.now() + 60 * 60 * 1000
			await wrapper.vm.submitCheckOut()
			await flushPromises()

			expect(checkOutSessionMock).not.toHaveBeenCalled()
			expect(wrapper.vm.checkOutFieldErrors.checked_out_at).toEqual(["The check-out time cannot be in the future."])
			expect(wrapper.vm.checkOutModalVisible).toBe(true)
			wrapper.unmount()
		})

		it("accepts a past check-out time", async () => {
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.openCheckOut(bookingSession)
			wrapper.vm.checkOutForm.checked_out_at = Date.now() - 60 * 60 * 1000
			await wrapper.vm.submitCheckOut()
			await flushPromises()

			expect(checkOutSessionMock).toHaveBeenCalledOnce()
			wrapper.unmount()
		})

		it("refuses a cleared check-out time", async () => {
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.openCheckOut(bookingSession)
			wrapper.vm.checkOutForm.checked_out_at = null
			await wrapper.vm.submitCheckOut()
			await flushPromises()

			expect(checkOutSessionMock).not.toHaveBeenCalled()
			wrapper.unmount()
		})

		/**
		 * Settlement is folded into check-out because the API refuses to settle a
		 * session that has not been checked out — every row on this board is by
		 * definition not yet checked out, so a standalone settle button could
		 * only ever 422.
		 */
		it("settles payment after check-out when a method was chosen", async () => {
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.openCheckOut(walkinSession)
			wrapper.vm.checkOutForm.payment_method = "mtn"
			await wrapper.vm.submitCheckOut()
			await flushPromises()

			expect(checkOutSessionMock).toHaveBeenCalledWith("walkin", 2, expect.any(Date))
			expect(settleSessionPaymentMock).toHaveBeenCalledWith("walkin", 2, "mtn")
			wrapper.unmount()
		})

		it("settles nothing when no method was chosen", async () => {
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.openCheckOut(bookingSession)
			await wrapper.vm.submitCheckOut()
			await flushPromises()

			expect(checkOutSessionMock).toHaveBeenCalledOnce()
			expect(settleSessionPaymentMock).not.toHaveBeenCalled()
			wrapper.unmount()
		})

		it("does not attempt settlement when the check-out itself failed", async () => {
			checkOutSessionMock.mockRejectedValue(new ApiError(422, JSON.stringify({ message: "The checkout time cannot be after the branch's closing time." })))
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.openCheckOut(bookingSession)
			wrapper.vm.checkOutForm.payment_method = "cash"
			await wrapper.vm.submitCheckOut()
			await flushPromises()

			expect(settleSessionPaymentMock).not.toHaveBeenCalled()
			expect(wrapper.vm.checkOutModalVisible).toBe(true)
			wrapper.unmount()
		})

		/**
		 * The check-out succeeded even though the settlement did not, so the
		 * dialog must close and the board must not keep showing a session that
		 * has ended. The failed settlement is reported by the toast, and the
		 * operator settles it from wherever settled payments are managed.
		 */
		it("closes and refetches when check-out succeeds but settlement fails", async () => {
			settleSessionPaymentMock.mockRejectedValue(new ApiError(409, JSON.stringify({ message: "This booking or session has already been paid." })))
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.openCheckOut(bookingSession)
			wrapper.vm.checkOutForm.payment_method = "cash"
			await wrapper.vm.submitCheckOut()
			await flushPromises()

			expect(checkOutSessionMock).toHaveBeenCalledOnce()
			expect(wrapper.vm.checkOutModalVisible).toBe(false)
			expect(listActiveSessionsMock.mock.calls.length).toBeGreaterThanOrEqual(2)
			wrapper.unmount()
		})

		it("starts each check-out from a clean payment choice", async () => {
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.openCheckOut(bookingSession)
			wrapper.vm.checkOutForm.payment_method = "cash"
			await wrapper.vm.submitCheckOut()
			await flushPromises()

			wrapper.vm.openCheckOut(walkinSession)
			expect(wrapper.vm.checkOutForm.payment_method).toBeNull()
			expect(wrapper.vm.checkOutFieldErrors).toEqual({})
			wrapper.unmount()
		})
	})

	describe("extend", () => {
		it("extends a booking by whole minutes and refetches", async () => {
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.openExtend(bookingSession)
			wrapper.vm.extendForm.additional_minutes = 45
			await wrapper.vm.submitExtend()
			await flushPromises()

			expect(extendBookingMock).toHaveBeenCalledWith(1, 45)
			expect(listActiveSessionsMock).toHaveBeenCalledTimes(2)
			expect(wrapper.vm.extendModalVisible).toBe(false)
			wrapper.unmount()
		})

		it("refuses zero, negative and fractional minutes without calling the API", async () => {
			const wrapper = mountPage()
			await flushPromises()

			for (const minutes of [0, -30, 1.5, null]) {
				wrapper.vm.openExtend(bookingSession)
				wrapper.vm.extendForm.additional_minutes = minutes
				await wrapper.vm.submitExtend()
				await flushPromises()
			}

			expect(extendBookingMock).not.toHaveBeenCalled()
			wrapper.unmount()
		})

		it("surfaces the server's 422 message when the extension will not fit", async () => {
			extendBookingMock.mockRejectedValue(new ApiError(422, JSON.stringify({ message: "The booking cannot run past 18:00." })))
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.openExtend(bookingSession)
			wrapper.vm.extendForm.additional_minutes = 180
			await wrapper.vm.submitExtend()
			await flushPromises()

			expect(wrapper.vm.extendModalVisible).toBe(true)
			expect(listActiveSessionsMock).toHaveBeenCalledTimes(1)
			wrapper.unmount()
		})
	})

	describe("cancel", () => {
		it("cancels a booking and refetches", async () => {
			const wrapper = mountPage()
			await flushPromises()

			await wrapper.vm.cancelSession(bookingSession)
			await flushPromises()

			expect(cancelBookingMock).toHaveBeenCalledWith(1)
			expect(listActiveSessionsMock).toHaveBeenCalledTimes(2)
			wrapper.unmount()
		})

		it("does not refetch when the cancellation window has passed", async () => {
			cancelBookingMock.mockRejectedValue(new ApiError(422, JSON.stringify({ message: "This booking is past its cancellation window." })))
			const wrapper = mountPage()
			await flushPromises()

			await wrapper.vm.cancelSession(bookingSession)
			await flushPromises()

			expect(listActiveSessionsMock).toHaveBeenCalledTimes(1)
			wrapper.unmount()
		})
	})

	it("shows a load error instead of an empty board when the list fails", async () => {
		listActiveSessionsMock.mockRejectedValue(new ApiError(500, ""))
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.text()).toContain("Couldn't load active sessions.")
		expect(wrapper.text()).not.toContain("Nobody is checked in right now.")
		wrapper.unmount()
	})

	it("says the board is empty when nobody is checked in", async () => {
		listActiveSessionsMock.mockResolvedValue([])
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.text()).toContain("Nobody is checked in right now.")
		wrapper.unmount()
	})
})
