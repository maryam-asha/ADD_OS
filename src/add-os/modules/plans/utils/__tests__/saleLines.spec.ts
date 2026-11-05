import type { SaleItem } from "@/add-os/modules/plans/types/retail"
import { describe, expect, it } from "vitest"
import { defaultSaleWarehouse, salePayload, scanSaleItem } from "../saleLines"

const cola = { id: 5, item: { id: 9, sku: "ITM-9", barcode: "6291041500213", image_url: null, name: { ar: "كولا" }, unit: null }, price_points: 20, is_active: true } as SaleItem
const empty = [{ saleItemId: null, quantity: 1 }]

describe("reception sale lines", () => {
	it("fills the empty line with a scanned sale item, then counts it up", () => {
		const first = scanSaleItem(empty, [cola], "6291041500213")
		expect(first).toEqual({ found: true, lines: [{ saleItemId: 5, quantity: 1 }] })

		const second = scanSaleItem(first.lines, [cola], " 6291041500213 ")
		expect(second.lines).toEqual([{ saleItemId: 5, quantity: 2 }])
	})

	it("adds nothing for a barcode no active sale item has", () => {
		expect(scanSaleItem(empty, [cola], "0000000000000")).toEqual({ found: false, lines: empty })
		expect(scanSaleItem(empty, [{ ...cola, is_active: false }], "6291041500213").found).toBe(false)
	})

	it("sends the chosen warehouse, and no stock location", () => {
		const payload = salePayload({ memberId: 3, method: "wallet", currency: null, warehouseId: 7, lines: [{ saleItemId: 5, quantity: 2 }] })
		expect(payload).toEqual({ user_id: 3, payment_method: "wallet", currency: null, warehouse_id: 7, lines: [{ sale_item_id: 5, quantity: 2 }] })
		expect(payload).not.toHaveProperty("stock_location")
	})

	it("preselects the primary only when the list belongs to the register's branch", () => {
		const warehouses = [
			{ id: 1, name: { ar: "ر" }, code: null, allows_sales: true, is_primary: true },
			{ id: 2, name: { ar: "ك" }, code: null, allows_sales: true, is_primary: false }
		]
		expect(defaultSaleWarehouse({ branch_id: 4, warehouses })).toBe(1)
		expect(defaultSaleWarehouse({ branch_id: null, warehouses })).toBeNull()
	})
})
