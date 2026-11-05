import { describe, expect, it } from "vitest"
import { blankWarehouseForm, canBePrimary, warehousePayload } from "../warehouses"

const filled = () => ({ ...blankWarehouseForm(), nameAr: " المطبخ ", nameEn: "Kitchen", branchId: 3, managerId: 7 })

describe("warehouse form", () => {
	it("sends item_ids only for a selected scope", () => {
		const all = warehousePayload({ ...filled(), scope: "all", itemIds: [4] })
		expect(all.item_scope).toBe("all")
		expect(all).not.toHaveProperty("item_ids")

		const selected = warehousePayload({ ...filled(), scope: "selected", itemIds: [4, 5] })
		expect(selected).toMatchObject({ item_scope: "selected", item_ids: [4, 5] })
	})

	it("trims the name, places it in its branch and names the manager", () => {
		expect(warehousePayload(filled())).toMatchObject({
			name: { ar: "المطبخ", en: "Kitchen" },
			place: { type: "branch", id: 3 },
			manager_id: 7,
			allows_sales: true
		})
		expect(warehousePayload({ ...filled(), branchId: null }).place).toBeNull()
	})

	it("is primary only with a branch and sales allowed", () => {
		expect(canBePrimary(filled())).toBe(true)
		expect(canBePrimary({ ...filled(), branchId: null })).toBe(false)
		expect(canBePrimary({ ...filled(), allowsSales: false })).toBe(false)
		expect(warehousePayload({ ...filled(), branchId: null, isPrimary: true }).is_primary).toBe(false)
		expect(warehousePayload({ ...filled(), isPrimary: true }).is_primary).toBe(true)
	})
})
