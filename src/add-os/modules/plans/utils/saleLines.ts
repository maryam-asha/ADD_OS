// src/add-os/modules/plans/utils/saleLines.ts

import type { ItemSalePayload, ItemSalePaymentMethod, ReceptionWarehouseOptions, SaleItem } from "@/add-os/modules/plans/types/retail"

/** One line of the sell form: a sale item and how many pieces. */
export interface SaleLine {
	saleItemId: number | null
	quantity: number
}

/**
 * A scanned barcode: the active sale item whose stock item carries it gets
 * a line of one piece — filling the form's empty line if there is one — or
 * one more piece when it is already on the form.
 */
export function scanSaleItem(lines: SaleLine[], saleItems: SaleItem[], code: string): { found: boolean; lines: SaleLine[] } {
	const wanted = code.trim()
	const saleItem = saleItems.find(item => item.is_active && item.item.barcode === wanted)
	if (!wanted || !saleItem) return { found: false, lines }

	const index = lines.findIndex(line => line.saleItemId === saleItem.id)
	if (index >= 0) return { found: true, lines: lines.map((line, i) => (i === index ? { ...line, quantity: line.quantity + 1 } : line)) }

	const blank = lines.findIndex(line => line.saleItemId === null)
	const added = { saleItemId: saleItem.id, quantity: 1 }
	return { found: true, lines: blank >= 0 ? lines.map((line, i) => (i === blank ? added : line)) : [...lines, added] }
}

export function salePayload(form: { memberId: number; method: ItemSalePaymentMethod; currency: string | null; warehouseId: number | null; lines: SaleLine[] }): ItemSalePayload {
	return {
		user_id: form.memberId,
		payment_method: form.method,
		currency: form.currency,
		warehouse_id: form.warehouseId,
		lines: form.lines.filter(line => line.saleItemId !== null).map(line => ({ sale_item_id: line.saleItemId!, quantity: line.quantity }))
	}
}

/**
 * The warehouse the sale form starts on: the primary of the open
 * register's branch. With no register open the list spans every branch,
 * so the desk chooses — taking the first primary would take another
 * branch's stock.
 */
export function defaultSaleWarehouse(options: ReceptionWarehouseOptions): number | null {
	if (options.branch_id === null) return null
	return options.warehouses.find(warehouse => warehouse.allows_sales && warehouse.is_primary)?.id ?? null
}
