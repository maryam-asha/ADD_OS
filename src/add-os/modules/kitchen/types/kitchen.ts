/**
 * The kitchen's orders, as ADD Core's admin API sends them
 * (ADDCore `app/Http/Resources/Kitchen/AdminKitchenOrderResource.php`,
 * `KitchenStoreController::row`, `QrPointResource`).
 */

export type KitchenOrderStatus = "awaiting_payment" | "awaiting_reception" | "pending" | "preparing" | "ready" | "delivered" | "rejected" | "cancelled"

/** Every status, in the order an order moves through them. */
export const KITCHEN_ORDER_STATUSES: readonly KitchenOrderStatus[] = ["awaiting_payment", "awaiting_reception", "pending", "preparing", "ready", "delivered", "rejected", "cancelled"]

/** Where the order goes: a desk, a room, the kitchen counter, or wherever the member's note says. */
export type DeliveryType = "desk" | "space" | "pickup" | "note"

export interface KitchenOrderLine {
	/** The line itself — what accepting with changes names. */
	id: number
	sale_item_id: number
	/** The item's name in the request's language; null when the item has since been removed. */
	name: string | null
	image_url: string | null
	/** What is made: less than `ordered_quantity`, or 0 (taken off), when the order was accepted with changes. */
	quantity: number
	/** What the member ordered. */
	ordered_quantity: number
	unit_price_points: number
	/** `quantity` × `unit_price_points`. */
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
	/** The session or booking the order is billed onto — the coworking names. Null when it was sent without a bill. */
	bill: { type: "booking" | "walkin"; id: number } | null
	/** Which queue it was sent to: straight to the kitchen, or first to reception to be confirmed. */
	route: "kitchen" | "reception"
	payment: {
		choice: "bill" | "wallet" | "card" | "cash"
		/** Whose wallet paid; null while nothing has. */
		wallet_owner_type: "user" | "company" | null
		paid: boolean
	}
	/** Points still to be taken in cash, for a cash order not yet paid; otherwise null. */
	cash_due_points: number | null
	/** What a cash order still owes the desk, in each active currency with a rate, base first; null when nothing is due. */
	cash_due_amounts: { currency: string, value: string }[] | null
	/** Cash taken for an order that was not made: owed to the member, handed back, or credited as points. Null when none was taken. */
	cash_return: "owed" | "returned_in_cash" | "credited_as_points" | null
	lines: KitchenOrderLine[]
	/** Every line's `quantity`: the items that are made. */
	items_count: number
	total_points: number
	/** Accepted with less than was ordered; `ordered_total_points` is what the order came to as sent. */
	adjusted: boolean
	ordered_total_points: number
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
	/** Null when the member's account has since been deleted. */
	member: { id: number; name: string; phone: string | null } | null
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

/** One row of reception's cash-to-return list (`KitchenCashReturnResource`): the order beside what was taken for it. */
export interface CashReturnRow {
	order: KitchenOrder
	/** What the payment is worth; crediting it gives this back as points. */
	points: number
	received_amount: string | null
	received_currency: string | null
}
