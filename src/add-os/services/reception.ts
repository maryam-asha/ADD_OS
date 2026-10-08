import type { Paginated, RawPaginatedResponse } from "./pagination"
import type { MessageResponse } from "./resource-factory"
import type {
	ActiveSession,
	BookingExtensionOptions,
	CheckOutSessionPayload,
	ConfirmSessionEndResponse,
	CreateReceptionBookingPayload,
	ExtendBookingPayload,
	PendingApprovalBooking,
	QuoteReceptionBookingPayload,
	ReceptionBookingQuote,
	ReceptionSessionReport,
	ReceptionSummary,
	RejectBookingPayload,
	SessionType,
	SettlePaymentPayload
} from "@/add-os/modules/booking/types/reception"
import type { PaymentMethod } from "@/add-os/modules/payments/types/wallet-top-up"
import type { AppliedDiscount } from "@/add-os/modules/pricing/types/applied-discount"
import type { CouponDiscountType } from "@/add-os/modules/pricing/types/coupon"
import { toOffsetIso } from "@/add-os/utils/format"
import { get, post } from "./api"
import { rowsOf, toPaginated } from "./pagination"

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
 *
 * `getExtensionOptions` is verified against the snapshot pinned 2026-10-03
 * (`GET .../reception/bookings/{booking}/extension-options`); booking-only for
 * the same reason as `extendBooking`.
 */

const BASE = "/api/v1/admin/reception"

/**
 * Re-exported so this module's own callers and tests keep one import, while
 * the implementation lives with the other date formatters — events send the
 * same shape, and two copies would drift.
 */
export { toOffsetIso }

/** The one place `type` becomes a URL. Every shared action routes through it. */
function sessionPrefix(type: SessionType): string {
	return type === "booking" ? `${BASE}/bookings` : `${BASE}/walk-ins`
}

/**
 * Reception booking a member in at the desk.
 *
 * Reuses the backend's own BookingCreationService unchanged, so every rule the
 * member-facing endpoint enforces applies here too — reception cannot
 * double-book a room the member endpoint would have refused, and cannot
 * back-date one either. The only difference is that the member is named in the
 * body rather than taken from the token.
 *
 * 422 `{message}` for any availability violation; 422 with a `wallet_options`
 * array when the member has more than one wallet that could pay and none was
 * chosen.
 */
export async function createReceptionBooking(payload: CreateReceptionBookingPayload): Promise<{ data: { id: number } }> {
	return post<{ data: { id: number } }>(`${BASE}/bookings`, payload)
}

/** What that booking would cost, in points and money, before it is made. Books nothing. */
export async function quoteReceptionBooking(payload: QuoteReceptionBookingPayload): Promise<ReceptionBookingQuote> {
	const res = await post<{ data: ReceptionBookingQuote }>(`${BASE}/bookings/quote`, payload)
	return res.data
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
	return rowsOf<ActiveSession>(raw.data)
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

/**
 * How far the booking can be extended and at what price — or why it cannot
 * (`can_extend: false`, `reason_label` translated by the server). A read; the
 * extend POST re-checks the same rules under its own lock.
 */
export async function getExtensionOptions(id: number): Promise<BookingExtensionOptions> {
	const raw = await get<{ data: BookingExtensionOptions }>(`${BASE}/bookings/${id}/extension-options`)
	return raw.data
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

/** The desk's day: counts, and what needs it next. */
export async function getReceptionSummary(): Promise<ReceptionSummary> {
	const res = await get<{ data: ReceptionSummary }>(`${BASE}/summary`)
	return res.data
}

/** A session's statement and, while open, what ending it would charge. */
export async function getSessionReport(type: SessionType, id: number): Promise<ReceptionSessionReport> {
	const res = await get<{ data: ReceptionSessionReport }>(`${BASE}/sessions/${type}/${id}/report`)
	return res.data
}

/**
 * Ends the session the member asked to end, settling it as they chose:
 * points are spent, and cash is recorded when `cashCollected` says the desk
 * has the money. The message says whether anything is still owed.
 */
export async function confirmSessionEnd(endRequestId: number, cashCollected = false): Promise<ConfirmSessionEndResponse> {
	return post<ConfirmSessionEndResponse>(`${BASE}/session-end-requests/${endRequestId}/confirm`, { cash_collected: cashCollected })
}

/**
 * How a plan sold at the desk is paid: the money handed over (`cash`), or the
 * points the owner's wallet already holds (`wallet`) — whole, never mixed,
 * and only when they cover the price (`wallet_covers` on the preview).
 */
export type PlanPurchasePaymentMethod = "cash" | "wallet"

export interface PlanPurchasePreviewPayload {
	plan_id: number
	user_id?: number | null
	company_id?: number | null
	/** Cash only — ignored when paying from points. */
	currency?: string
	payment_method: PlanPurchasePaymentMethod
	/** A code the member brought; a member's plan only (422 with `company_id`). */
	coupon_code?: string
}

/** The running offer that priced the plan, as the preview names it. */
export interface PlanPurchaseOffer {
	name: string | null
	discount_type: CouponDiscountType
	/** A percentage, points off, or the fixed price in points — per `discount_type`. */
	discount_value: number
	saved_points: number
	ends_at: string | null
}

/** What became of `coupon_code`: used, or not because the offer was better. */
export interface PlanPurchaseCouponOutcome {
	code: string
	applied: boolean
	points_discounted: number
	message: string | null
}

export interface PlanPurchasePreview {
	list_points: number
	points: number
	payment_amount: number
	payment_currency: string
	/** The owner's general points now. */
	balance_points: number
	/** Whether those points pay for the whole plan — offer `wallet` only then. */
	wallet_covers: boolean
	offer: PlanPurchaseOffer | null
	coupon: PlanPurchaseCouponOutcome | null
}

export interface PlanPurchaseReceipt {
	transaction_code: string
	plan_name: string
	payment_method: PlanPurchasePaymentMethod
	points_charged: number
	/** Null when paid from points: no money changed hands. */
	payment_amount: number | null
	payment_currency: string | null
	/** What priced it, as locked on the payment. */
	discounts: AppliedDiscount[]
	coupon: PlanPurchaseCouponOutcome | null
	previous_balance_points: number
	new_balance_points: number
	recipient_name: string
	performed_by_name: string
	membership: unknown
	payment: unknown
}

export async function previewPlanPurchase(payload: PlanPurchasePreviewPayload): Promise<PlanPurchasePreview> {
	const res = await post<{ data: PlanPurchasePreview }>(`${BASE}/plan-purchases/preview`, payload)
	return res.data
}

export async function executePlanPurchase(payload: PlanPurchasePreviewPayload): Promise<PlanPurchaseReceipt> {
	const res = await post<{ data: PlanPurchaseReceipt }>(`${BASE}/plan-purchases`, payload)
	return res.data
}
