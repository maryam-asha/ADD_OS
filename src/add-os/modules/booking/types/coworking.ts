// src/add-os/modules/booking/types/coworking.ts

/**
 * The branch's co-working seat pool.
 *
 * Seats are counted once per branch, not per co-working space: every active
 * co_space's capacity, plus rooms lent to co-working at that moment, are
 * open; every active subscription holds its seats while its plan is open, and
 * each co_space booking and walk-in inside now takes one (on the member's
 * subscription when they hold one). The server counts; this client only shows
 * the counts (backend docs/decisions/coworking-seat-pool.md).
 */

/** One stretch of the range over which nothing changed. */
export interface PoolSegment {
	/** ISO-8601 with the district's offset. */
	start: string
	end: string
	capacity: number
	usage: number
	/** Negative when overbooked. */
	free: number
}

/** `GET /api/v1/admin/branches/{branch}/coworking-pool`. */
export interface CoworkingPool {
	from: string
	to: string
	capacity_now: number
	usage_now: number
	free_now: number
	/** The fewest free seats anywhere in the range; negative when overbooked. */
	min_free: number
	segments: PoolSegment[]
}

/**
 * A room lent to co-working: its `seats` join the pool from `starts_at` to
 * `ends_at`, and it takes no room bookings meanwhile.
 */
export interface CoworkingWindow {
	id: number
	space_id: number
	/** ISO-8601 with the district's offset. */
	starts_at: string
	ends_at: string
	seats: number
}

/**
 * Lending a room. Times are district wall-clock (`YYYY-MM-DD HH:mm`), read
 * by the server in the district's timezone like every booking time.
 */
export interface CoworkingWindowPayload extends Record<string, unknown> {
	starts_at: string
	ends_at: string
	seats: number
}
