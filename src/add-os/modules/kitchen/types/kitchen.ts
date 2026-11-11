/**
 * The kitchen's orders, as ADD Core's admin API sends them
 * (ADDCore `app/Http/Resources/Kitchen/AdminKitchenOrderResource.php`,
 * `KitchenStoreController::row`, `QrPointResource`).
 */

export type KitchenOrderStatus = "pending" | "preparing" | "ready" | "delivered" | "rejected" | "cancelled"

/** Every status, in the order an order moves through them. */
export const KITCHEN_ORDER_STATUSES: readonly KitchenOrderStatus[] = ["pending", "preparing", "ready", "delivered", "rejected", "cancelled"]

/** Where the order goes: a desk, a room, the kitchen counter, or wherever the member's note says. */
export type DeliveryType = "desk" | "space" | "pickup" | "note"

export interface KitchenOrderLine {
	sale_item_id: number
	/** The item's name in the request's language; null when the item has since been removed. */
	name: string | null
	quantity: number
	unit_price_points: number
	line_points: number
}

export interface KitchenOrder {
	id: number
	status: KitchenOrderStatus
	source: "qr" | "app"
	delivery: {
		type: DeliveryType
		/** The desk's label, the room's title, the counter's name, or the note itself. */
		label: string | null
		note: string | null
	}
	/** The session or booking the order is billed onto — the coworking names. */
	bill: { type: "booking" | "walkin"; id: number }
	lines: KitchenOrderLine[]
	total_points: number
	rejection_reason: string | null
	cancelled_by: "member" | "system" | null
	/**
	 * Nested under `timestamps` on the wire (KitchenOrderResource), not flat on
	 * the order. ISO 8601 with offset; null until the step happens.
	 */
	timestamps: {
		submitted_at: string | null
		accepted_at: string | null
		ready_at: string | null
		delivered_at: string | null
	}
	paid: boolean
	member: { id: number; name: string; phone: string | null }
	/** From when it was sent until now while open, or until it was delivered, rejected or cancelled. */
	waited_seconds: number
}

export interface KitchenStoreRow {
	branch: { id: number; name: string }
	warehouse: { id: number; name: string } | null
}

export type QrPlaceType = "seat_desk" | "space"

export interface QrPoint {
	id: number
	branch_id: number
	place_type: QrPlaceType
	place_id: number
	place_label: string | null
	scan_value: string
}
