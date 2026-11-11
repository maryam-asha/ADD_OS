import type { Paginated, RawPaginatedResponse } from "./pagination"
import type { MessageResponse } from "./resource-factory"
import type { KitchenOrder, KitchenOrderStatus, KitchenStoreRow, QrPlaceType, QrPoint } from "@/add-os/modules/kitchen/types/kitchen"
import { del, get, post, put } from "./api"
import { rowsOf, toPaginated } from "./pagination"

/**
 * The kitchen's side of members' orders: the queue and its history, the four
 * things the kitchen does to an order, which warehouse each branch's kitchen
 * draws from, and the QR points members scan to order.
 *
 * Read from ADD Core's source on its `kitchen-orders` branch
 * (`routes/api/v1/admin.php`, `KitchenOrderController`, `KitchenStoreController`,
 * `QrPointController`, `app/Http/Resources/Kitchen/*`) on 2026-11-11. NOT yet
 * confirmed from the pinned collection: the snapshot in `docs/api/` (pinned
 * 2026-10-18) has no kitchen endpoint, and the canonical file gains them only
 * when the backend branch lands — re-pin then and cite the pin date here.
 *
 * Every action answers the order as it now stands; the screens reload their
 * list afterwards rather than splice it in. A refusal (409 "already handled",
 * 422 out of stock) carries the server's own sentence in `message`.
 */

const BASE = "/api/v1/admin"

export interface KitchenOrderQuery {
	branch_id?: number
	/** Sent as one comma-separated value. Absent, the API answers only the open ones (pending, preparing, ready). */
	status?: KitchenOrderStatus[]
	/** Days sent, `YYYY-MM-DD`, inclusive. */
	from?: string
	to?: string
	user_id?: number
	/** `oldest` (the API's default, the live queue) or `newest` (the history). */
	sort?: "oldest" | "newest"
	page?: number
	/** 1–100; the API's default is 25. */
	per_page?: number
}

export async function listKitchenOrders(q: KitchenOrderQuery = {}): Promise<Paginated<KitchenOrder>> {
	const { status, ...rest } = q
	const query: Record<string, unknown> = { ...rest }
	if (status && status.length > 0) query.status = status.join(",")
	return toPaginated(await get<RawPaginatedResponse<KitchenOrder>>(`${BASE}/kitchen/orders`, query))
}

export async function getKitchenOrder(id: number): Promise<KitchenOrder> {
	return (await get<{ data: KitchenOrder }>(`${BASE}/kitchen/orders/${id}`)).data
}

async function act(id: number, action: "accept" | "reject" | "ready" | "deliver", body?: unknown): Promise<KitchenOrder> {
	return (await post<{ data: KitchenOrder }>(`${BASE}/kitchen/orders/${id}/${action}`, body)).data
}

/** Draws the order's lines from the branch's kitchen store; 422 names an item short of stock. */
export function acceptKitchenOrder(id: number): Promise<KitchenOrder> {
	return act(id, "accept")
}

/** A pending order only; `reason` is required, at most 300 characters. */
export function rejectKitchenOrder(id: number, reason: string): Promise<KitchenOrder> {
	return act(id, "reject", { reason })
}

/** A preparing order only. */
export function markKitchenOrderReady(id: number): Promise<KitchenOrder> {
	return act(id, "ready")
}

/** A preparing or ready order. */
export function markKitchenOrderDelivered(id: number): Promise<KitchenOrder> {
	return act(id, "deliver")
}

/** One row per branch, with the warehouse its kitchen draws from (null when none is set). */
export async function listKitchenStores(): Promise<KitchenStoreRow[]> {
	return rowsOf<KitchenStoreRow>((await get<{ data: unknown }>(`${BASE}/kitchen/stores`)).data)
}

/** The warehouse must be the branch's own, allow sales, and not be its main store — the API answers 422 otherwise. */
export async function setKitchenStore(branchId: number, warehouseId: number): Promise<KitchenStoreRow> {
	return (await put<{ data: KitchenStoreRow }>(`${BASE}/kitchen/stores/${branchId}`, { warehouse_id: warehouseId })).data
}

export interface QrPointQuery {
	branch_id?: number
	place_type?: QrPlaceType
	page?: number
	per_page?: number
}

/** Unpaginated unless `per_page` is sent (AdminResourceController). */
export async function listQrPoints(q: QrPointQuery = {}): Promise<Paginated<QrPoint>> {
	return toPaginated(await get<RawPaginatedResponse<QrPoint>>(`${BASE}/qr-points`, { ...q }))
}

/** Making one for a place that has one already answers the existing point. */
export async function createQrPoint(payload: { place_type: QrPlaceType; place_id: number }): Promise<QrPoint> {
	return (await post<{ data: QrPoint }>(`${BASE}/qr-points`, payload)).data
}

export function removeQrPoint(id: number): Promise<MessageResponse> {
	return del<MessageResponse>(`${BASE}/qr-points/${id}`)
}
