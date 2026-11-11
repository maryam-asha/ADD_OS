import { beforeEach, describe, expect, it, vi } from "vitest"

import { listKitchenOrders, rejectKitchenOrder, setKitchenStore } from "../kitchen"

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
})
