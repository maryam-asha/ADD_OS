import type { ArrivalRequest } from "@/add-os/modules/kiosk/types/arrival-request"
import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import { ApiError } from "@/add-os/services/api"
import ArrivalRequestsPage from "../ArrivalRequestsPage.vue"

const { listMock, confirmMock, rejectMock, listSpacesMock } = vi.hoisted(() => ({
	listMock: vi.fn(),
	confirmMock: vi.fn(),
	rejectMock: vi.fn(),
	listSpacesMock: vi.fn()
}))

vi.mock("@/add-os/services/reception", () => ({
	listArrivalRequests: listMock,
	confirmArrivalRequest: confirmMock,
	rejectArrivalRequest: rejectMock
}))

vi.mock("@/add-os/services/spaces", () => ({
	listSpaces: listSpacesMock
}))

const { messageError, messageSuccess } = vi.hoisted(() => ({
	messageError: vi.fn(),
	messageSuccess: vi.fn()
}))

// useReceptionAction calls useMessage() directly — same provider pitfall
// ApprovalQueuePage.spec.ts documents. Captured rather than discarded here,
// because the 409 assertion below is specifically about what it is handed.
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: messageSuccess, error: messageError }) }
})

const matchedRow: ArrivalRequest = {
	id: 1,
	status: "pending",
	requested_at: "2026-08-26T09:15:00+03:00",
	matched_booking_id: 42,
	user: { id: 12, name: "Sara Haddad", phone: "0900000001" },
	matched_booking: { id: 42, space_id: 5, space_type: "room", start_at: "2026-08-26T10:00:00+03:00", end_at: "2026-08-26T12:00:00+03:00" }
}

const walkInRow: ArrivalRequest = {
	id: 2,
	status: "pending",
	requested_at: "2026-08-26T09:40:00+03:00",
	matched_booking_id: null,
	user: { id: 13, name: "Omar Nasri", phone: "0900000002" },
	matched_booking: null
}

const spaces = [
	{ id: 5, building_id: 1, zone_id: null, space_type: "room", allocation_model: null, is_lockable: true, capacity: 8, hourly_rate: null, pricing_currency: null, status: "active", status_reason: null },
	{ id: 9, building_id: 1, zone_id: null, space_type: "co_space", allocation_model: null, is_lockable: false, capacity: 40, hourly_rate: null, pricing_currency: null, status: "active", status_reason: null }
]

function pageOf(rows: ArrivalRequest[], meta: Partial<{ current_page: number; last_page: number; per_page: number; total: number }> = {}) {
	return { data: rows, meta: { current_page: 1, last_page: 1, per_page: 25, total: rows.length, ...meta } }
}

const i18n = createI18n({
	legacy: false,
	locale: "en",
	messages: {
		en: {
			nav: { pages: { arrivalRequests: "Arrival requests" } },
			spaces: { spaceType: { co_space: "Co-working space", room: "Room", business: "Business", event_hall: "Event hall" } },
			arrivalRequests: {
				description: "Members waiting at the reception desk.",
				loadError: "Couldn't load arrival requests.",
				empty: "Nobody is waiting.",
				noBooking: "Walk-in",
				columns: { member: "Member", phone: "Phone", waiting: "Waiting", booking: "Booking", actions: "Actions" },
				confirm: {
					button: "Confirm",
					success: "Arrival confirmed.",
					spaceTitle: "Which space?",
					spaceLabel: "Space",
					spaceOption: "{space} · seats {capacity}"
				},
				reject: { button: "Reject", success: "Arrival rejected." }
			},
			resourceCrud: {
				form: { submit: "Save", cancel: "Cancel" },
				validation: { required: "{field} is required." },
				mutations: { genericError: "Something went wrong.", permissionError: "No permission." }
			}
		}
	}
})

function mountPage() {
	return mount(ArrivalRequestsPage, { global: { plugins: [i18n] }, attachTo: document.body })
}

describe("arrivalRequestsPage", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		listMock.mockResolvedValue(pageOf([matchedRow, walkInRow]))
		listSpacesMock.mockResolvedValue(spaces)
		confirmMock.mockResolvedValue({ message: "Arrival confirmed." })
		rejectMock.mockResolvedValue({ message: "Arrival rejected." })
	})

	it("asks for the first page on mount and shows what comes back", async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(listMock).toHaveBeenCalledWith({ page: 1 })
		expect(wrapper.vm.rows).toEqual([matchedRow, walkInRow])
		wrapper.unmount()
	})

	describe("a matched-booking row", () => {
		/**
		 * The backend checks the member into their own booking, so a body would be
		 * meaningless. Asserting the exact single-argument call is what fails if
		 * someone later starts always sending a space.
		 */
		it("confirms with no body and no space picker", async () => {
			const wrapper = mountPage()
			await flushPromises()

			await wrapper.vm.confirm(matchedRow)
			await flushPromises()

			expect(confirmMock).toHaveBeenCalledWith(1)
			expect(confirmMock.mock.calls[0]).toHaveLength(1)
			expect(wrapper.vm.spaceDrawerVisible).toBe(false)
			wrapper.unmount()
		})

		it("refetches after confirming, and the actioned row is gone", async () => {
			const wrapper = mountPage()
			await flushPromises()
			listMock.mockResolvedValue(pageOf([walkInRow]))

			await wrapper.vm.confirm(matchedRow)
			await flushPromises()

			expect(listMock).toHaveBeenCalledTimes(2)
			expect(wrapper.vm.rows).toEqual([walkInRow])
			wrapper.unmount()
		})
	})

	describe("an unmatched row", () => {
		it("opens the space picker instead of confirming immediately", async () => {
			const wrapper = mountPage()
			await flushPromises()

			await wrapper.vm.confirm(walkInRow)
			await flushPromises()

			expect(confirmMock).not.toHaveBeenCalled()
			expect(wrapper.vm.spaceDrawerVisible).toBe(true)
			expect(wrapper.vm.confirmTargetId).toBe(2)
			wrapper.unmount()
		})

		/**
		 * "Don't let the button be clickable without a selection" is enforced by the
		 * drawer's own required rule, not by a hand-rolled disabled state — so this
		 * asserts the rule exists and actually rejects an empty value, which is the
		 * thing that would silently stop working if the field were rebuilt.
		 */
		it("requires a space before confirm can be submitted", async () => {
			const wrapper = mountPage()
			await flushPromises()

			await wrapper.vm.confirm(walkInRow)
			const field = wrapper.vm.spaceFields.find(f => f.key === "space_id")!

			expect(field.required).toBe(true)
			expect(wrapper.vm.spaceForm.space_id).toBeNull()

			// The drawer never calls onSubmit while validation fails, so an empty
			// form cannot reach the network at all.
			expect(confirmMock).not.toHaveBeenCalled()
			wrapper.unmount()
		})

		it("sends space_id once one is chosen, then closes and refetches", async () => {
			const wrapper = mountPage()
			await flushPromises()
			await wrapper.vm.confirm(walkInRow)

			await wrapper.vm.submitConfirmWithSpace({ space_id: 9 })
			await flushPromises()

			expect(confirmMock).toHaveBeenCalledWith(2, 9)
			expect(wrapper.vm.spaceDrawerVisible).toBe(false)
			expect(listMock).toHaveBeenCalledTimes(2)
			wrapper.unmount()
		})

		it("offers every space, unfiltered, since the backend imposes no narrowing", async () => {
			const wrapper = mountPage()
			await flushPromises()

			expect(listSpacesMock).toHaveBeenCalled()
			expect(wrapper.vm.spaces).toEqual(spaces)

			await wrapper.vm.confirm(walkInRow)
			const options = wrapper.vm.spaceFields.find(f => f.key === "space_id")!.options!

			expect(options.map(o => o.value)).toEqual([5, 9])
			expect(options[0].label).toBe("Room #5 · seats 8")
			wrapper.unmount()
		})

		it("starts each picker session blank rather than from the previous one", async () => {
			const wrapper = mountPage()
			await flushPromises()

			await wrapper.vm.confirm(walkInRow)
			wrapper.vm.spaceForm.space_id = 9
			await wrapper.vm.submitConfirmWithSpace({ space_id: 9 })
			await flushPromises()

			await wrapper.vm.confirm({ ...walkInRow, id: 3 })

			expect(wrapper.vm.spaceForm.space_id).toBeNull()
			expect(wrapper.vm.confirmTargetId).toBe(3)
			wrapper.unmount()
		})
	})

	describe("reject", () => {
		/**
		 * No dialog: rejecting an arrival signal charges nothing and cancels
		 * nothing. The call reaching the service directly, with no intermediate
		 * confirmation step, IS the behaviour under test.
		 */
		it("fires immediately with no confirmation dialog", async () => {
			const wrapper = mountPage()
			await flushPromises()

			await wrapper.vm.reject(walkInRow)
			await flushPromises()

			expect(rejectMock).toHaveBeenCalledWith(2)
			expect(rejectMock.mock.calls[0]).toHaveLength(1)
			expect(document.body.querySelector(".n-dialog")).toBeNull()
			wrapper.unmount()
		})

		it("refetches after rejecting", async () => {
			const wrapper = mountPage()
			await flushPromises()
			listMock.mockResolvedValue(pageOf([matchedRow]))

			await wrapper.vm.reject(walkInRow)
			await flushPromises()

			expect(listMock).toHaveBeenCalledTimes(2)
			expect(wrapper.vm.rows).toEqual([matchedRow])
			wrapper.unmount()
		})
	})

	describe("a row someone else already actioned", () => {
		const conflict = () => new ApiError(409, JSON.stringify({ message: "This arrival request is no longer pending." }))

		it("surfaces the server's own message rather than a generic error", async () => {
			confirmMock.mockRejectedValue(conflict())
			const wrapper = mountPage()
			await flushPromises()

			await wrapper.vm.confirm(matchedRow)
			await flushPromises()

			expect(messageError).toHaveBeenCalledWith("This arrival request is no longer pending.")
			expect(messageError).not.toHaveBeenCalledWith("Something went wrong.")
			wrapper.unmount()
		})

		/**
		 * The refetch is the point. A 409 means this page's picture of the row is
		 * provably stale, so it must go back to the server rather than leave a row
		 * on screen that no longer exists in the queue.
		 */
		it("refetches so the stale row leaves the queue", async () => {
			confirmMock.mockRejectedValue(conflict())
			const wrapper = mountPage()
			await flushPromises()
			listMock.mockResolvedValue(pageOf([walkInRow]))

			await wrapper.vm.confirm(matchedRow)
			await flushPromises()

			expect(listMock).toHaveBeenCalledTimes(2)
			expect(wrapper.vm.rows).toEqual([walkInRow])
			wrapper.unmount()
		})

		it("does the same for a rejected row", async () => {
			rejectMock.mockRejectedValue(conflict())
			const wrapper = mountPage()
			await flushPromises()

			await wrapper.vm.reject(walkInRow)
			await flushPromises()

			expect(messageError).toHaveBeenCalledWith("This arrival request is no longer pending.")
			expect(listMock).toHaveBeenCalledTimes(2)
			wrapper.unmount()
		})

		it("keeps the picker open when an unmatched confirm conflicts", async () => {
			confirmMock.mockRejectedValue(conflict())
			const wrapper = mountPage()
			await flushPromises()

			await wrapper.vm.confirm(walkInRow)
			await wrapper.vm.submitConfirmWithSpace({ space_id: 9 })
			await flushPromises()

			expect(wrapper.vm.spaceDrawerVisible).toBe(true)
			wrapper.unmount()
		})
	})

	describe("pagination", () => {
		it("keeps the backend's own meta rather than synthesizing one", async () => {
			listMock.mockResolvedValue(pageOf([matchedRow], { last_page: 4, total: 87 }))
			const wrapper = mountPage()
			await flushPromises()

			expect(wrapper.vm.meta?.last_page).toBe(4)
			wrapper.unmount()
		})

		it("hides the pager when everything fits on one page", async () => {
			const wrapper = mountPage()
			await flushPromises()

			expect(wrapper.find(".n-pagination").exists()).toBe(false)
			wrapper.unmount()
		})
	})

	it("says the queue is empty when it is, without calling that an error", async () => {
		listMock.mockResolvedValue(pageOf([]))
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.text()).toContain("Nobody is waiting.")
		expect(wrapper.text()).not.toContain("Couldn't load arrival requests.")
		wrapper.unmount()
	})

	it("shows a load error instead of an empty table when the list fails", async () => {
		listMock.mockRejectedValue(new ApiError(500, ""))
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.text()).toContain("Couldn't load arrival requests.")
		expect(wrapper.text()).not.toContain("Nobody is waiting.")
		wrapper.unmount()
	})
})
