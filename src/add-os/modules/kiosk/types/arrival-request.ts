// src/add-os/modules/kiosk/types/arrival-request.ts
import type { SpaceType } from "@/add-os/modules/spatial/types/space"

/**
 * A member's "I've arrived" signal, waiting on a reception decision.
 *
 * Shape from `ArrivalRequestResource` in ADDCore, matching
 * `Admin (Dashboard) → Reception Operations → Arrival Requests` in the API
 * snapshot pinned 2026-08-25 (`sha256 86d330d9…`).
 *
 * `SpaceType` is reused from `modules/spatial` rather than redeclared, so the
 * existing `spaces.spaceType.*` translations cover it and an unrecognised value
 * is a type error here rather than a missing-translation key on screen — the
 * same reason `SPACE_TYPES` was moved next to its type for the reception
 * columns.
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
