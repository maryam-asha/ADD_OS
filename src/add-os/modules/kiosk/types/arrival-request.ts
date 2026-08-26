// src/add-os/modules/kiosk/types/arrival-request.ts
import type { SpaceType } from "@/add-os/modules/spatial/types/space"

/**
 * A member's "I've arrived" signal, waiting on a reception decision.
 *
 * Shape from `ArrivalRequestResource` in ADDCore, matching
 * `Admin (Dashboard) → Reception Operations → Arrival Requests` in the API
 * snapshot pinned 2026-08-25 (`sha256 86d330d9…`).
 *
 * `SpaceType` is reused from `modules/spatial` rather than redeclared, and that
 * carries the same known caveat `modules/booking/types/reception.ts` already
 * records: the backend task's sample row for this very resource shows
 * `"meeting_room"`, which is not in the enum the collection states for Spaces
 * (`co_space | room | business | event_hall`). It is read here as prose
 * shorthand for `room`, not as a fifth value — the same reading the booking
 * types took, so the two do not disagree about one wire field.
 *
 * The safety net is at the RENDER layer, not the type layer:
 * `buildArrivalRequestColumns` goes through `spaceTypeLabel`, which prints an
 * unrecognised value verbatim instead of a missing-translation key. A surprise
 * on the wire therefore shows up as a visibly odd cell rather than the literal
 * string `spaces.spaceType.meeting_room`.
 */

/** Only the three fields the resource actually exposes — not the full user record. */
export interface ArrivalRequestUser {
	id: number
	name: string
	phone: string
}

export interface ArrivalRequestBooking {
	id: number
	space_id: number
	space_type: SpaceType
	start_at: string
	end_at: string
}

export interface ArrivalRequest {
	id: number
	/**
	 * Always `"pending"` on this endpoint — the controller filters to it
	 * server-side and there is no status query param. Typed as the literal rather
	 * than a union so a row that could be anything else is a compile error, not a
	 * silently unhandled branch.
	 */
	status: "pending"
	requested_at: string
	matched_booking_id: number | null
	user: ArrivalRequestUser
	/**
	 * `null` when the member has no booking today. This is the ORDINARY walk-in
	 * case, not an error state — and it is what decides whether confirming needs
	 * a `space_id`. Both keys are always present: `ArrivalRequestResource` wraps
	 * them in `whenLoaded` and the controller always eager-loads
	 * `['user', 'matchedBooking.space']`.
	 */
	matched_booking: ArrivalRequestBooking | null
}

/** Sent only when confirming an UNMATCHED request. A matched one takes no body. */
export interface ConfirmArrivalRequestPayload {
	space_id: number
}
