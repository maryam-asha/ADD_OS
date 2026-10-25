// src/add-os/modules/plans/types/retail.ts

import type { Bilingual, PlaceDescription, PlaceRef } from "@/add-os/modules/inventory/types/inventory"

/**
 * Selling stock at the reception desk (ADD Core `App\Domain\Retail`,
 * 2026-10-24): what reception may sell and its price in points is ADD's own
 * (`admin/sale-items`); the stock itself is the inventory's. A sale is paid
 * from the member's points or with money handed over, and issued from stock
 * in the same transaction — so a sale on record is a paid one.
 */
export interface SaleItem {
	id: number
	item: { id: number; sku: string; name: Bilingual; unit: Bilingual | null }
	price_points: number
	is_active: boolean
}

export interface SaleItemPayload extends Record<string, unknown> {
	inventory_item_id: number | null
	price_points: number
	is_active: boolean
}

export interface ItemSaleLine {
	item: { id: number; sku: string; name: Bilingual }
	quantity: number
	unit_price_points: number
	line_points: number
}

export interface ItemSale {
	id: number
	member: { id: number; name: string }
	stock_location: PlaceDescription
	lines: ItemSaleLine[]
	total_points: number
	sold_by: { id: number; name: string } | null
	paid_at: string | null
	payment?: { id: number; status: string; method: string; amount_points: number | null } | null
}

/** `wallet` spends the member's own points; a desk method takes money at today's price. */
export type ItemSalePaymentMethod = "cash" | "wallet"

export interface ItemSalePayload {
	user_id: number
	lines: { sale_item_id: number; quantity: number }[]
	payment_method: ItemSalePaymentMethod
	currency?: string | null
	/** Where the stock leaves from; by default the branch of the operator's open cash register. */
	stock_location?: PlaceRef | null
}
