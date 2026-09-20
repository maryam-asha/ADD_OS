// src/add-os/modules/booking/types/availability.ts

/**
 * The slot grid and duration ladder for one space on one date.
 *
 * These are the shapes behind the desk's booking form. Their whole purpose is
 * that the form offers the windows `BookingCreationService` will actually
 * accept — before the operator submits, not after a 422.
 *
 * **The dashboard and the member app read the same endpoint payloads.** The
 * backend serves `/admin/spaces/{id}/availability/{slots,quote}` from the same
 * `AvailabilityBrowseService` as the member routes, and a backend test asserts
 * the two responses are identical for the same space and date. So these types
 * describe one contract, not an admin variant of one.
 *
 * ── What must never be re-derived here ──────────────────────────────────────
 *
 * Every rule that decides whether a window is bookable — slot granularity,
 * minimum duration, buffer between bookings, overlap, capacity on a shared
 * space, and the ban on back-dating — lives in one place on the server. The
 * client's job is to render `state`/`is_available` and `reason`, never to
 * compute them. Deriving "this looks bookable" from open/close times alone
 * would be a second copy of the rules, free to disagree with the one that
 * decides, and it would disagree exactly where it matters: a slot inside
 * business hours that is nonetheless refused.
 */

/**
 * Why a slot cannot be taken.
 *
 * `at_capacity` is distinct from `booked`: a co-working space with free seats
 * is not booked out, and a shared space at its seat ceiling is not "booked" by
 * any one member. `buffer` is the gap a space requires between bookings.
 */
export type SlotState = "available" | "booked" | "outside_hours" | "buffer" | "at_capacity" | "past"

/** One bookable window. Slots exist only inside open periods. */
export interface AvailabilitySlot {
	/** ISO-8601 carrying the district's offset, e.g. `2026-08-17T08:00:00+03:00`. */
	start_at: string
	end_at: string
	/** Pre-formatted for display in the request's locale, e.g. "08:00 AM". */
	label: string
	/** 24-hour wall-clock, e.g. "08:00" — the value to send back, not the label. */
	start_time: string
	end_time: string
	state: SlotState
	is_available: boolean
	/**
	 * The server's own sentence for why this slot is refused, already in the
	 * requested language, and word-for-word what `POST` would answer for the
	 * same window. Shown as-is — rewording it here would mean the chip and the
	 * error message disagreed about the same rule.
	 */
	reason: string | null
}

/** How many slots fell into each state. */
export interface SlotCounts {
	available: number
	booked: number
	outside_hours: number
	buffer: number
	at_capacity: number
	past: number
	total: number
}

/** The banner shown when the branch is shut on the requested date. */
export interface ClosedBanner {
	text: string
	/** Only non-null when an explicit business-hour exception supplied one. */
	reason: string | null
	severity: string
}

export interface SlotsResponse {
	state: string
	closed_banner: ClosedBanner | null
	data: AvailabilitySlot[]
	counts: SlotCounts
	meta: {
		granularity_minutes: number
		timezone: string
	}
}

/**
 * One rung of the duration ladder.
 *
 * An option that cannot be booked arrives `available: false` **with a
 * reason** rather than missing. Hiding it would leave the operator asking why
 * 1.5h is not offered; showing it greyed with the reason answers that.
 */
export interface DurationOption {
	minutes: number
	/** e.g. "1.5h", already localized. */
	label: string
	end_at: string
	end_time: string
	points: number
	amount_usd: string
	available: boolean
	reason: string | null
}

export interface QuoteResponse {
	start_at: string
	start_time: string
	hourly_rate_points: number
	hourly_rate_usd: string
	durations: DurationOption[]
	meta: {
		min_duration_minutes: number
		granularity_minutes: number
		timezone: string
	}
}
