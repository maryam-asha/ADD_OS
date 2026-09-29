// src/add-os/modules/booking/types/availability.ts

/**
 * The cells of one space on one date.
 *
 * These are the shapes behind the desk's booking form. Their whole purpose is
 * that the form offers the windows `BookingCreationService` will actually
 * accept — before the operator submits, not after a 422.
 *
 * **The dashboard and the member app read the very same response.** The
 * backend serves `/admin/spaces/{id}/availability/slots` from the same
 * `AvailabilityBrowseService` call as the member route, and a backend test
 * asserts the two bodies are identical for the same space and date. A booking
 * is picked the same way on both: a run of consecutive free cells, first to
 * last, at least `booking_window.min_duration_minutes` long — read once from
 * the calendar, as the member app reads its rules once from the space details.
 *
 * ── What must never be re-derived here ──────────────────────────────────────
 *
 * Every rule that decides whether a window is bookable — slot granularity,
 * minimum duration, buffer between bookings, overlap, capacity on a shared
 * space, the ban on back-dating and the booking window (minimum notice, how
 * far ahead) — lives in one place on the server. The client's job is to render
 * `is_available`, and to keep a picked run unbroken and at least the minimum
 * long; never to compute a cell's state. The POST re-checks the whole run, and
 * its 422 names the rule a refused run broke.
 */

/**
 * Free, or not. A buffer, a full shared space or a date beyond the window all
 * read as `booked` — "not this cell". A cell that has started, or is inside
 * the minimum notice, is never sent at all.
 */
export type SlotState = "available" | "booked"

/**
 * One cell of the space's grid, `meta.granularity_minutes` long, judged on its
 * own: is this stretch free. Cells exist only inside open periods.
 */
export interface AvailabilitySlot {
	/**
	 * 12-hour wall-clock, e.g. "01:00 PM" (AM/PM in Latin letters in every
	 * language) — shown as-is and sent back as-is. There is no separately
	 * formatted label, so what the operator sees is exactly what is posted.
	 * Never compare two of these as text: "01:00 PM" sorts before "11:00 AM".
	 */
	start_time: string
	end_time: string
	state: SlotState
	is_available: boolean
}

/** How many of the cells sent are free, and how many are not. */
export interface SlotCounts {
	available: number
	booked: number
	total: number
}

/** The banner shown when the branch is shut on the requested date. */
export interface ClosedBanner {
	text: string
	hint: string
	/** Only non-null when an explicit business-hour exception supplied one. */
	reason: string | null
	severity: string
}

/** The body of `GET …/availability/slots`, inside its `data` envelope. */
export interface DaySlots {
	/** `YYYY-MM-DD`, echoed so a stale answer can be recognised. */
	date: string
	state: string
	closed_banner: ClosedBanner | null
	slots: AvailabilitySlot[]
	counts: SlotCounts
	meta: {
		/** Every cell's length: a run of n cells is n × this many minutes. */
		granularity_minutes: number
		timezone: string
	}
}
