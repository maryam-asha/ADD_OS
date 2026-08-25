import type { Paginated, RawPaginatedResponse } from "./pagination"
import type { MessageResponse } from "./resource-factory"
import type {
	ActiveSession,
	CheckOutSessionPayload,
	ExtendBookingPayload,
	PendingApprovalBooking,
	RejectBookingPayload,
	SessionType,
	SettlePaymentPayload
} from "@/add-os/modules/booking/types/reception"
import type { PaymentMethod } from "@/add-os/modules/payments/types/wallet-top-up"
import { get, post } from "./api"
import { toPaginated } from "./pagination"

/**
 * Reception desk actions — approvals and live sessions.
 *
 * Not built on `createResourceApi`: none of these are the five CRUD verbs it
 * factors out. They are named POST commands against sub-paths, and two of them
 * are shared by two different resources.
 *
 * That sharing is the reason this file exists as one module. A live session row
 * is a booking OR a walk-in, and check-out and settle-payment hit a different
 * URL prefix for each — but the operator sees one table with one set of
 * buttons. `sessionPrefix()` below is the ONE place that mapping lives; the
 * views pass `row.type` through and never build a path.
 *
 * Endpoints verified against the API snapshot pinned 2026-08-25
 * (`docs/api/ADD-OS.postman_collection.json` → Admin (Dashboard) → Reception
 * Operations). Note what is deliberately absent: there is no walk-in `cancel`
 * and no walk-in `extend` in the collection, so this file exposes neither.
 * `cancelBooking`/`extendBooking` take a bare id rather than a `SessionType`,
 * which makes calling them for a walk-in a type error rather than a 404.
 */

const BASE = "/api/v1/admin/reception"

function pad(value: number): string {
	return value < 10 ? `0${value}` : String(value)
}

/**
 * Serializes a `Date` the way the collection's own examples write it:
 * `2026-08-17T11:00:00+03:00` — local wall clock with an explicit UTC offset,
 * NOT `toISOString()`'s UTC `Z` form.
 *
 * Both parse to the same instant, so this is not a correctness fix. It is a
 * legibility one: `checked_out_at` is read back by humans in Damascus, and a
 * value that says 08:00Z for an 11:00 check-out invites someone to "correct"
 * it. Matching the documented shape keeps the wire log readable as the wall
 * clock the operator actually saw.
 *
 * Exported for its own test — the offset branch is the part that goes wrong,
 * and asserting it through a fetch body would be testing it by accident.
 */
export function toOffsetIso(at: Date): string {
	const offsetMinutes = -at.getTimezoneOffset()
	const sign = offsetMinutes < 0 ? "-" : "+"
	const absolute = Math.abs(offsetMinutes)

	const date = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`
	const time = `${pad(at.getHours())}:${pad(at.getMinutes())}:${pad(at.getSeconds())}`
	const offset = `${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`

	return `${date}T${time}${offset}`
}

/** The one place `type` becomes a URL. Every shared action routes through it. */
function sessionPrefix(type: SessionType): string {
	return type === "booking" ? `${BASE}/bookings` : `${BASE}/walk-ins`
}

/**
 * Paginated — 25 per page, newest `start_at` first, `status = pending` only.
 * Returns `Paginated`, not `T[]`: this is the first list screen in the app that
 * pages, so discarding `meta` here would silently show page 1 of N.
 */
export async function listPendingApprovals(query?: Record<string, unknown>): Promise<Paginated<PendingApprovalBooking>> {
	const raw = await get<RawPaginatedResponse<PendingApprovalBooking>>(`${BASE}/bookings/pending-approval`, query)
	return toPaginated(raw)
}

/** Not paginated — a small live list, refetched whole. */
export async function listActiveSessions(): Promise<ActiveSession[]> {
	const raw = await get<{ data: ActiveSession[] }>(`${BASE}/sessions/active`)
	return raw.data
}

/** 409 `{message}` when the booking is already confirmed, rejected or cancelled. */
export async function approveBooking(id: number): Promise<MessageResponse> {
	return post<MessageResponse>(`${BASE}/bookings/${id}/approve`)
}

/** `rejection_reason` is required server-side; a missing one is a 422. */
export async function rejectBooking(id: number, rejectionReason: string): Promise<MessageResponse> {
	const payload: RejectBookingPayload = { rejection_reason: rejectionReason }
	return post<MessageResponse>(`${BASE}/bookings/${id}/reject`, payload)
}

/** 422 `{message}` when the booking is past its cancellation window. */
export async function cancelBooking(id: number): Promise<MessageResponse> {
	return post<MessageResponse>(`${BASE}/bookings/${id}/cancel`)
}

/** 422 `{message}` naming the latest possible end time when the extension won't fit. */
export async function extendBooking(id: number, additionalMinutes: number): Promise<MessageResponse> {
	const payload: ExtendBookingPayload = { additional_minutes: additionalMinutes }
	return post<MessageResponse>(`${BASE}/bookings/${id}/extend`, payload)
}

/**
 * Takes a `Date`, not a string: the wire format is this module's business, and
 * a caller that formats its own timestamp is a caller that can get the offset
 * wrong. Server-side rules the client cannot mirror — `before_or_equal:now`
 * against the server's clock, and "not after the branch's closing time" —
 * still come back as a 422 carrying its own message.
 */
export async function checkOutSession(type: SessionType, id: number, checkedOutAt: Date): Promise<MessageResponse> {
	const payload: CheckOutSessionPayload = { checked_out_at: toOffsetIso(checkedOutAt) }
	return post<MessageResponse>(`${sessionPrefix(type)}/${id}/check-out`, payload)
}

/**
 * 422 when the session has not been checked out yet, 409 when it is already
 * paid. The first of those is why the dashboard settles payment as part of
 * check-out rather than as a standalone row action: every row on the active
 * board is by definition not yet checked out.
 */
export async function settleSessionPayment(type: SessionType, id: number, paymentMethod: PaymentMethod): Promise<MessageResponse> {
	const payload: SettlePaymentPayload = { payment_method: paymentMethod }
	return post<MessageResponse>(`${sessionPrefix(type)}/${id}/settle-payment`, payload)
}
