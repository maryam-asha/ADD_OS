import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import { ApiError } from "@/add-os/services/api"
import ApprovalQueuePage from "../ApprovalQueuePage.vue"

const { listPendingApprovalsMock, approveBookingMock, rejectBookingMock } = vi.hoisted(() => ({
	listPendingApprovalsMock: vi.fn(),
	approveBookingMock: vi.fn(),
	rejectBookingMock: vi.fn()
}))

vi.mock("@/add-os/services/reception", () => ({
	listPendingApprovals: listPendingApprovalsMock,
	approveBooking: approveBookingMock,
	rejectBooking: rejectBookingMock
}))

// Same pitfall WalletTopUpsPage.spec.ts documents: the page calls useMessage()
// directly, which needs a provider it has no reason to mount.
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: vi.fn(), error: vi.fn() }) }
})

const pendingRow = {
	id: 1,
	space_id: 5,
	space_type: "event_hall" as const,
	user_id: 12,
	user_name: "Sara Haddad",
	start_at: "2026-08-26T09:00:00+03:00",
	end_at: "2026-08-26T11:00:00+03:00",
	created_at: "2026-08-25T08:00:00+03:00"
}

function pageOf(rows: (typeof pendingRow)[], meta: Partial<{ current_page: number; last_page: number; per_page: number; total: number }> = {}) {
	return {
		data: rows,
		meta: { current_page: 1, last_page: 1, per_page: 25, total: rows.length, ...meta }
	}
}

const i18n = createI18n({
	legacy: false,
	locale: "en",
	messages: {
		en: {
			nav: { pages: { approvalQueue: "Approval queue" } },
			spaces: { spaceType: { co_space: "Co-working space", room: "Room", business: "Business", event_hall: "Event hall" } },
			approvalQueue: {
				description: "Bookings waiting on a reception decision.",
				loadError: "Couldn't load the approval queue.",
				empty: "Nothing is waiting for approval.",
				columns: { requester: "Requester", space: "Space", when: "When", requested: "Requested", actions: "Actions" },
				approve: { button: "Approve", success: "Booking approved." },
				reject: {
					button: "Reject",
					title: "Reject booking",
					reasonLabel: "Reason",
					reasonPlaceholder: "Why is this being rejected?",
					reasonRequired: "Give a reason for the rejection.",
					success: "Booking rejected."
				}
			},
			resourceCrud: {
				form: { submit: "Save", cancel: "Cancel" },
				mutations: { genericError: "Something went wrong.", permissionError: "No permission." }
			}
		}
	}
})

function mountPage() {
	return mount(ApprovalQueuePage, { global: { plugins: [i18n] }, attachTo: document.body })
}

describe("approvalQueuePage", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		listPendingApprovalsMock.mockResolvedValue(pageOf([pendingRow]))
		approveBookingMock.mockResolvedValue({ message: "Booking approved." })
		rejectBookingMock.mockResolvedValue({ message: "Booking rejected." })
	})

	it("asks for the first page on mount and shows what comes back", async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(listPendingApprovalsMock).toHaveBeenCalledWith({ page: 1 })
		expect(wrapper.vm.rows).toEqual([pendingRow])
		wrapper.unmount()
	})

	/**
	 * The row leaving the queue is the backend's doing, not the page's — an
	 * approved booking is no longer `status = pending`, so it simply isn't in
	 * the next response. What the page owes is the refetch that asks. Asserting
	 * the emptied list rather than just "refetch was called" is what makes this
	 * test fail if a future version optimistically splices the row out locally
	 * and skips the round trip.
	 */
	it("approves, refetches, and the approved row is gone", async () => {
		const wrapper = mountPage()
		await flushPromises()
		listPendingApprovalsMock.mockResolvedValue(pageOf([]))

		await wrapper.vm.approve(pendingRow)
		await flushPromises()

		expect(approveBookingMock).toHaveBeenCalledWith(1)
		expect(listPendingApprovalsMock).toHaveBeenCalledTimes(2)
		expect(wrapper.vm.rows).toEqual([])
		wrapper.unmount()
	})

	it("surfaces a 409 from approve and leaves the row in the queue", async () => {
		approveBookingMock.mockRejectedValue(new ApiError(409, JSON.stringify({ message: "This booking is not awaiting approval." })))
		const wrapper = mountPage()
		await flushPromises()

		await wrapper.vm.approve(pendingRow)
		await flushPromises()

		expect(listPendingApprovalsMock).toHaveBeenCalledTimes(1)
		expect(wrapper.vm.rows).toEqual([pendingRow])
		wrapper.unmount()
	})

	it("will not reject without a reason, and says why on the field", async () => {
		const wrapper = mountPage()
		await flushPromises()

		wrapper.vm.openReject(pendingRow)
		wrapper.vm.rejectForm.rejection_reason = "   "
		await wrapper.vm.submitReject()
		await flushPromises()

		expect(rejectBookingMock).not.toHaveBeenCalled()
		expect(wrapper.vm.rejectFieldErrors.rejection_reason).toEqual(["Give a reason for the rejection."])
		expect(wrapper.vm.rejectModalVisible).toBe(true)
		wrapper.unmount()
	})

	it("rejects with a trimmed reason, closes the dialog, and refetches", async () => {
		const wrapper = mountPage()
		await flushPromises()
		listPendingApprovalsMock.mockResolvedValue(pageOf([]))

		wrapper.vm.openReject(pendingRow)
		wrapper.vm.rejectForm.rejection_reason = "  Space closed for maintenance that day.  "
		await wrapper.vm.submitReject()
		await flushPromises()

		expect(rejectBookingMock).toHaveBeenCalledWith(1, "Space closed for maintenance that day.")
		expect(wrapper.vm.rejectModalVisible).toBe(false)
		expect(listPendingApprovalsMock).toHaveBeenCalledTimes(2)
		wrapper.unmount()
	})

	/**
	 * The client rule and the server rule are the same rule, so the only way to
	 * exercise the 422 path is a reason the client accepts. A blank one never
	 * reaches the network.
	 */
	it("puts a server 422 on the reason field and keeps the dialog open with the text intact", async () => {
		rejectBookingMock.mockRejectedValue(
			new ApiError(422, JSON.stringify({ message: "The given data was invalid.", errors: { rejection_reason: ["The rejection reason field is required."] } }))
		)
		const wrapper = mountPage()
		await flushPromises()

		wrapper.vm.openReject(pendingRow)
		wrapper.vm.rejectForm.rejection_reason = "Too short"
		await wrapper.vm.submitReject()
		await flushPromises()

		expect(wrapper.vm.rejectFieldErrors.rejection_reason).toEqual(["The rejection reason field is required."])
		expect(wrapper.vm.rejectModalVisible).toBe(true)
		expect(wrapper.vm.rejectForm.rejection_reason).toBe("Too short")
		wrapper.unmount()
	})

	it("starts each rejection from a blank reason rather than the previous one", async () => {
		const wrapper = mountPage()
		await flushPromises()

		wrapper.vm.openReject(pendingRow)
		wrapper.vm.rejectForm.rejection_reason = "Space closed."
		await wrapper.vm.submitReject()
		await flushPromises()

		wrapper.vm.openReject({ ...pendingRow, id: 2 })
		expect(wrapper.vm.rejectForm.rejection_reason).toBe("")
		expect(wrapper.vm.rejectFieldErrors).toEqual({})
		wrapper.unmount()
	})

	describe("pagination", () => {
		it("keeps the backend's own meta rather than synthesizing one", async () => {
			listPendingApprovalsMock.mockResolvedValue(pageOf([pendingRow], { current_page: 1, last_page: 4, total: 87 }))
			const wrapper = mountPage()
			await flushPromises()

			expect(wrapper.vm.meta?.last_page).toBe(4)
			expect(wrapper.vm.meta?.total).toBe(87)
			wrapper.unmount()
		})

		it("refetches with the page the operator moved to", async () => {
			listPendingApprovalsMock.mockResolvedValue(pageOf([pendingRow], { last_page: 4, total: 87 }))
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.page = 3
			await flushPromises()

			expect(listPendingApprovalsMock).toHaveBeenLastCalledWith({ page: 3 })
			wrapper.unmount()
		})

		it("hides the pager when everything fits on one page", async () => {
			const wrapper = mountPage()
			await flushPromises()

			expect(wrapper.find(".n-pagination").exists()).toBe(false)
			wrapper.unmount()
		})

		it("shows the pager once there is more than one page", async () => {
			listPendingApprovalsMock.mockResolvedValue(pageOf([pendingRow], { last_page: 4, total: 87 }))
			const wrapper = mountPage()
			await flushPromises()

			expect(wrapper.find(".n-pagination").exists()).toBe(true)
			wrapper.unmount()
		})
	})

	it("shows a load error instead of an empty table when the list fails", async () => {
		listPendingApprovalsMock.mockRejectedValue(new ApiError(500, ""))
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.text()).toContain("Couldn't load the approval queue.")
		expect(wrapper.text()).not.toContain("Nothing is waiting for approval.")
		wrapper.unmount()
	})

	it("says the queue is empty when it is, without calling that an error", async () => {
		listPendingApprovalsMock.mockResolvedValue(pageOf([]))
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.text()).toContain("Nothing is waiting for approval.")
		expect(wrapper.text()).not.toContain("Couldn't load the approval queue.")
		wrapper.unmount()
	})
})
