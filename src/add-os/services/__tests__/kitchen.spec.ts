import { beforeEach, describe, expect, it, vi } from "vitest"

import { canReviewKitchenOrders } from "@/add-os/config/permissions"
import { confirmKitchenOrder, creditCashAsPoints, listCashReturns, listKitchenOrders, listOrdersToConfirm, markCashReturned, rejectKitchenOrder, setKitchenStore, turnDownKitchenOrder } from "../kitchen"

const { getMock, postMock, putMock } = vi.hoisted(() => ({
	getMock: vi.fn(),
	postMock: vi.fn(),
	putMock: vi.fn()
}))

vi.mock("../api", () => ({ get: getMock, post: postMock, put: putMock, del: vi.fn() }))

describe("kitchen service", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("lists_with_status_csv", async () => {
		getMock.mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, total: 0 } })

		await listKitchenOrders({ branch_id: 2, status: ["pending", "preparing", "ready"], page: 1 })

		expect(getMock).toHaveBeenCalledWith("/api/v1/admin/kitchen/orders", { branch_id: 2, status: "pending,preparing,ready", page: 1 })
	})

	it("reject_sends_reason", async () => {
		postMock.mockResolvedValue({ data: { id: 7 } })

		const order = await rejectKitchenOrder(7, "Out of milk")

		expect(postMock).toHaveBeenCalledWith("/api/v1/admin/kitchen/orders/7/reject", { reason: "Out of milk" })
		expect(order).toEqual({ id: 7 })
	})

	it("sets_store_by_branch", async () => {
		putMock.mockResolvedValue({ data: { branch: { id: 3, name: "Main" }, warehouse: { id: 9, name: "Café" } } })

		await setKitchenStore(3, 9)

		expect(putMock).toHaveBeenCalledWith("/api/v1/admin/kitchen/stores/3", { warehouse_id: 9 })
	})

	it("lists_pass_branch_and_page", async () => {
		getMock.mockResolvedValue({ data: [], meta: { current_page: 2, last_page: 2, total: 0 } })

		await listOrdersToConfirm({ branch_id: 2, page: 2 })
		await listCashReturns({ branch_id: 2, page: 2 })

		expect(getMock).toHaveBeenNthCalledWith(1, "/api/v1/admin/reception/kitchen-orders", { branch_id: 2, page: 2 })
		expect(getMock).toHaveBeenNthCalledWith(2, "/api/v1/admin/reception/kitchen-cash-returns", { branch_id: 2, page: 2 })
	})

	it("confirm_sends_currency_only_when_given", async () => {
		postMock.mockResolvedValue({ data: { id: 5 } })

		await confirmKitchenOrder(5)
		await confirmKitchenOrder(5, "USD")

		expect(postMock).toHaveBeenNthCalledWith(1, "/api/v1/admin/reception/kitchen-orders/5/accept", undefined)
		expect(postMock).toHaveBeenNthCalledWith(2, "/api/v1/admin/reception/kitchen-orders/5/accept", { currency: "USD" })
	})

	it("confirm_sends_receptions_note_trimmed_and_leaves_a_blank_one_out", async () => {
		postMock.mockResolvedValue({ data: { id: 5 } })

		await confirmKitchenOrder(5, null, "  Table 3  ")
		await confirmKitchenOrder(5, "USD", "Table 3")
		await confirmKitchenOrder(5, null, "   ")

		expect(postMock).toHaveBeenNthCalledWith(1, "/api/v1/admin/reception/kitchen-orders/5/accept", { note: "Table 3" })
		expect(postMock).toHaveBeenNthCalledWith(2, "/api/v1/admin/reception/kitchen-orders/5/accept", { currency: "USD", note: "Table 3" })
		expect(postMock).toHaveBeenNthCalledWith(3, "/api/v1/admin/reception/kitchen-orders/5/accept", undefined)
	})

	it("turn_down_sends_reason", async () => {
		postMock.mockResolvedValue({ data: { id: 5 } })

		await turnDownKitchenOrder(5, "No cash")

		expect(postMock).toHaveBeenCalledWith("/api/v1/admin/reception/kitchen-orders/5/reject", { reason: "No cash" })
	})

	it("cash_return_actions_hit_their_paths", async () => {
		postMock.mockResolvedValue({ data: { order: { id: 5 }, points: 10, received_amount: "10", received_currency: "SYP" } })

		const row = await markCashReturned(5)
		await creditCashAsPoints(5)

		expect(row.points).toBe(10)
		expect(postMock).toHaveBeenNthCalledWith(1, "/api/v1/admin/reception/kitchen-cash-returns/5/returned")
		expect(postMock).toHaveBeenNthCalledWith(2, "/api/v1/admin/reception/kitchen-cash-returns/5/credit-points")
	})

	it("review_permission_is_exported", () => {
		expect(typeof canReviewKitchenOrders).toBe("function")
	})
})
