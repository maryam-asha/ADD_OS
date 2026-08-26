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
import type { ArrivalRequest, ConfirmArrivalRequestPayload } from "@/add-os/modules/kiosk/types/arrival-request"
import type { PaymentMethod } from "@/add-os/modules/payments/types/wallet-top-up"
import { toOffsetIso } from "@/add-os/utils/format"
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
 * `toOffsetIso` used to live here and is now `utils/format/dates.ts`'s, because
 * `services/announcements.ts` became a second consumer and the wire format for
 * a timestamp is one decision, not one per service. No re-export shim was left
 * behind: a name with two homes is a name that drifts.
 *
 * Endpoints verified against the API snapshot pinned 2026-08-25
 * (`docs/api/ADD-OS.postman_collection.json` → Admin (Dashboard) → Reception
 * Operations). Note what is deliberately absent: there is no walk-in `cancel`
 * and no walk-in `extend` in the collection, so this file exposes neither.
 * `cancelBooking`/`extendBooking` take a bare id rather than a `SessionType`,
 * which makes calling them for a walk-in a type error rather than a 404.
 */

const BASE = "/api/v1/admin/reception"

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

/**
 * Members waiting at the desk — paginated, 25 per page, `status = pending` only,
 * oldest `requested_at` FIRST (the controller's `orderBy('requested_at')` is
 * ascending, unlike the approvals list above). Longest wait leads, which is what
 * a queue should show.
 *
 * Lives in this file rather than its own because `/api/v1/admin/reception` is
 * this module's prefix — the same reason `payments.walletTopUps` posts through
 * here. A second file re-declaring `BASE` is how two spellings of one path
 * appear.
 */
export async function listArrivalRequests(query?: Record<string, unknown>): Promise<Paginated<ArrivalRequest>> {
	const raw = await get<RawPaginatedResponse<ArrivalRequest>>(`${BASE}/arrival-requests`, query)
	return toPaginated(raw)
}

/**
 * Confirms an arrival. The body depends on what the backend matched:
 *
 *  - matched booking → NO body. The controller delegates to `checkIn` and
 *    propagates that response verbatim on failure, so this can also surface
 *    already-checked-in and outside-business-hours errors that belong to
 *    check-in rather than to arrival.
 *  - no matched booking (an ordinary walk-in) → `space_id` is REQUIRED; the
 *    controller 422s on a missing one before it does anything else.
 *
 * `spaceId` is optional in the signature rather than split into two functions
 * because the caller already branches on `row.matched_booking`; two names would
 * make that branch appear twice.
 *
 * 409 `{message}` when the request has already been confirmed, rejected or
 * expired — routine at a desk where two operators can act on the same row.
 */
export async function confirmArrivalRequest(id: number, spaceId?: number): Promise<MessageResponse> {
	const payload: ConfirmArrivalRequestPayload | undefined = spaceId === undefined ? undefined : { space_id: spaceId }
	return post<MessageResponse>(`${BASE}/arrival-requests/${id}/confirm`, payload)
}

/**
 * Rejects an arrival. No body, and nothing to undo: the request itself never
 * charged anything or reserved a space, so there is no cancellation or refund
 * path behind this. 409 `{message}` if it is no longer pending.
 */
export async function rejectArrivalRequest(id: number): Promise<MessageResponse> {
	return post<MessageResponse>(`${BASE}/arrival-requests/${id}/reject`)
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
