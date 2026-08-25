// src/add-os/modules/booking/types/reception.ts
import type { PaymentMethod } from "@/add-os/modules/payments/types/wallet-top-up"
import type { SpaceType } from "@/add-os/modules/spatial/types/space"

/**
 * Reception desk — the approval queue and the live-sessions board.
 *
 * Shapes are from `Admin (Dashboard) → Reception Operations` in the API
 * snapshot pinned 2026-08-25 (`docs/api/ADD-OS.postman_collection.json`),
 * cross-read against the backend task that shipped the two GETs.
 *
 * The collection carries no saved example response for either endpoint — that
 * is true of every endpoint in the file — so the field lists below are the
 * contract as specified, not one observed on the wire. Two consequences worth
 * knowing before trusting a field:
 *
 *  - `meta` on the paginated list is documented ("Paginated (25/page)") but its
 *    shape has never been captured. `toPaginated` tolerates a missing
 *    `per_page`, which is exactly what the specified shape omits.
 *  - `space_type` is typed against the enum the collection states for Spaces
 *    (`co_space | room | business | event_hall`). The backend task's sample row
 *    shows `"meeting_room"`, which is not in that enum and is read here as
 *    prose shorthand for `room` rather than a fifth value. The columns render
 *    an unrecognised value verbatim instead of a missing-translation key, so a
 *    surprise on the wire shows up as a visibly odd cell, not a crash.
 *
 * There is deliberately no translatable Space *name* here: this codebase has
 * no such field, and `space_type` is the established stand-in — the same one
 * `ArrivalRequestResource` uses.
 */

/** Which endpoint family a live session row belongs to. Drives the URL prefix. */
export type SessionType = "booking" | "walkin"

/**
 * A booking awaiting a reception decision.
 *
 * Only Event Hall bookings ever reach `pending` — meeting rooms auto-confirm —
 * so in practice `space_type` is `event_hall` on every row. Typed as the full
 * enum anyway: the queue is defined by status, not by space type, and hardcoding
 * that correlation would break silently the first time another space is marked
 * `requires_approval`.
 */
export interface PendingApprovalBooking {
	id: number
	space_id: number
	space_type: SpaceType
	user_id: number
	user_name: string
	/** ISO-8601 with offset, e.g. "2026-08-26T09:00:00+03:00". */
	start_at: string
	end_at: string
	created_at: string
}

/**
 * One currently checked-in, not-yet-checked-out occupancy — a booking or a
 * walk-in, flattened into a single list so the dashboard renders one table.
 *
 * `is_overdue` is the backend's own branch-closing-time check, the same one the
 * `reception:close-overdue-sessions` scheduled command uses. It is not derived
 * here, and must not be: the closing time lives on the branch, which this
 * payload does not carry.
 */
export interface ActiveSession {
	id: number
	type: SessionType
	space_id: number
	space_type: SpaceType
	user_id: number
	user_name: string
	checked_in_at: string
	is_overdue: boolean
}

export interface RejectBookingPayload {
	rejection_reason: string
}

export interface ExtendBookingPayload {
	/** Integer, >= 1. A 422 names the latest possible end time when it won't fit. */
	additional_minutes: number
}

export interface CheckOutSessionPayload {
	/** ISO-8601 with offset, `before_or_equal:now`. */
	checked_out_at: string
}

export interface SettlePaymentPayload {
	payment_method: PaymentMethod
}
