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
	/**
	 * A walk-in only: whether it sits in the seat its subscription holds
	 * (`true`) or took a free seat from the branch's co-working pool
	 * (`false`). `null` for a booking, whose seat is the booking.
	 */
	seat_covered: boolean | null
	membership_id: number | null
	/**
	 * The codes of the desks this member's Dedicated Desk subscription (their
	 * own or their company's) ties them to — empty for everyone else.
	 */
	desk_codes: string[]
	/** The member's waiting "end session" press, or null. */
	end_request?: SessionEndRequestSummary | null
	member?: { id: number, name: string, phone: string | null, avatar_url: string | null, company: string | null }
}

/** A member's "end session" press. `payment_method` is how they chose to pay: `wallet`, `cash`, a gateway, or null. */
export interface SessionEndRequestSummary {
	id: number
	status: "pending" | "confirmed" | "cancelled" | "superseded"
	payment_method: string | null
	requested_at: string | null
	resolved_at: string | null
	checked_out_at: string | null
}

/** `GET .../reception/summary` — the desk's day at a glance. */
export interface ReceptionSummary {
	stats: {
		active_sessions: number
		expected_bookings: number
		pending_arrivals: number
		pending_end_requests: number
		pending_payments: number
	}
	/** What needs the desk next, soonest first. `at` is district wall-clock with its offset. */
	upcoming: {
		kind: "end_request" | "arrival" | "booking"
		id: number
		at: string
		member: { id: number | null, name: string | null }
		space: string | null
		session: { type: SessionType, id: number } | null
		payment_method: string | null
	}[]
}

/** One row of a session's statement, as the server words it. */
export interface SessionReportLine {
	kind: "time" | "resource_consumption"
	label: string
	quantity: number
	unit: string | null
	source: "plan" | "charge" | null
	points: number | null
	amount: string | null
}

/**
 * `GET .../reception/sessions/{type}/{id}/report`: the session's statement,
 * and — while it is open — what ending it would charge, at the moment the
 * member asked to end.
 */
export interface ReceptionSessionReport {
	session: {
		type: SessionType
		id: number
		space: { id: number, name: string }
		checked_in_at: string
		checked_out_at: string | null
		duration_seconds: number
	}
	lines: SessionReportLine[]
	member: { id: number, name: string, phone: string | null }
	closing: {
		at: string
		points: number
		covered_seconds: number
		already_paid: boolean
		amounts: { currency: string, value: string }[]
		end_request: SessionEndRequestSummary | null
	} | null
	wallet_points: number
}

export interface ConfirmSessionEndResponse {
	message: string
	data: { payment_state: string | null, price_points: number, amount_owed: string }
}

export interface RejectBookingPayload {
	rejection_reason: string
}

export interface ExtendBookingPayload {
	/**
	 * One of the `minutes` the booking's extension options offer. A 422 names
	 * the latest possible end time when it won't fit.
	 */
	additional_minutes: number
}

/**
 * Why a booking cannot be extended right now. `reason_label` carries the
 * server's own translated sentence; this key is for logic, not for display.
 */
export type ExtensionBlockReason = "space_disallows" | "not_checked_in" | "outside_booking_time" | "next_slot_booked" | "branch_closing"

/** One length the booking can grow by. */
export interface ExtensionOption {
	/** What `POST .../extend` takes as `additional_minutes`. */
	minutes: number
	/** Server-rendered duration, e.g. "1h". */
	label: string
	/** ISO-8601 with the district's offset. */
	end_at: string
	/** Server-rendered 12-hour time, e.g. "03:00 PM". */
	end_time: string
	/** What the extension charges, plan discount included. */
	price_points: number
	/** The same price in the member's currency, server-rendered; `null` when free. */
	price: string | null
	price_point: string | null
}

/**
 * `GET /api/v1/admin/reception/bookings/{id}/extension-options` — the same
 * answer the member app gets (ADDCore
 * `docs/decisions/booking-outcomes-and-extension.md`). A booking extends only
 * while it runs, its member checked in, on a space that allows it, and only as
 * far as the next booking (and its buffer), a co-working loan, the seat pool
 * or the branch's closing allows. The extend POST re-checks the same rules.
 */
export interface BookingExtensionOptions {
	can_extend: boolean
	reason: ExtensionBlockReason | null
	reason_label: string | null
	current_end_at: string
	/** The latest the member can stay. Equals `current_end_at` when nothing fits. */
	latest_end_at: string
	/** Empty whenever `can_extend` is false. */
	options: ExtensionOption[]
}

export interface CheckOutSessionPayload {
	/** ISO-8601 with offset, `before_or_equal:now`. */
	checked_out_at: string
}

export interface SettlePaymentPayload {
	payment_method: PaymentMethod
}

/**
 * Reception creating a booking on a member's behalf — the walk-up at the desk,
 * and the "book it for them" action on the calendar.
 *
 * `start_at`/`end_at` are wall-clock strings in the district's own timezone
 * (`YYYY-MM-DD HH:mm`), not ISO instants, matching the request body in the API
 * snapshot pinned 2026-09-20. The backend reads a bare value as local time by
 * design; sending an offset here would be re-interpreted rather than honoured.
 *
 * Every availability rule the member endpoint enforces applies to this one too
 * — business hours, granularity, minimum duration, overlap, buffer, the
 * space's own ceiling, and the no-back-dating rule. A violation comes back as
 * a 422 carrying its own translated message.
 */
export interface CreateReceptionBookingPayload {
	user_id: number
	space_id: number
	start_at: string
	end_at: string
	/**
	 * Always named by the desk — no wallet is debited unasked. `wallet` pays
	 * from the member's points now (too few is a 422); `cash` with
	 * `cash_collected` settles the booking at once; `cash` without it leaves
	 * it unpaid, to collect on arrival.
	 */
	payment_method: "wallet" | "cash"
	cash_collected?: boolean
	note?: string
}

/** What `POST .../reception/bookings/quote` takes: the booking, without its payment. */
export type QuoteReceptionBookingPayload = Pick<CreateReceptionBookingPayload, "user_id" | "space_id" | "start_at" | "end_at">

/**
 * What the booking would cost: hours × the space's hourly rate in points,
 * less the member's plan discount — the server's own breakdown — and the
 * total in every currency the desk takes cash in.
 */
export interface ReceptionBookingQuote {
	minutes: number
	hourly_rate_points: number
	total_points: number
	breakdown: {
		lines: { key: string, label: string, points: number }[]
		total: { points: number, amount: number | string, formatted: string }
	}
	/** `value` is a decimal string, as the ledger keeps it. */
	amounts: { currency: string, value: string }[]
	/** The member's wallets, and whether each can pay the total now. */
	wallets: { owner_type: string, owner_id: number, owner_label: string | null, usable_balance: number, sufficient: boolean }[]
}

/** The three choices the desk picks from, mapped onto `payment_method` + `cash_collected`. */
export type ReceptionBookingPayment = "wallet" | "cash_now" | "cash_later"
