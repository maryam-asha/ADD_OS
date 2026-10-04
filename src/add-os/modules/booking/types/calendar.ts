// src/add-os/modules/booking/types/calendar.ts
import type { SpaceType } from "@/add-os/modules/spatial/types/space"

/**
 * The operations calendar and the general bookings index.
 *
 * Shapes are from `Admin (Dashboard) → Calendar & Bookings` in the API
 * snapshot pinned 2026-09-20 (`docs/api/ADD-OS.postman_collection.json`).
 * Unlike every other endpoint family in this codebase, these were
 * **observed**, not only specified: the backend captured real responses while
 * building them and transcribed them into its own
 * `docs/api/booking-availability-endpoints.md`. Where a field below looks
 * surprising, that document is where it is explained.
 *
 * Two distinctions this file exists to keep straight, because getting either
 * wrong produces a screen that lies quietly rather than one that breaks:
 *
 *  1. **A closed day and a full day are not the same.** `CalendarDayState` is
 *     `open | closed` and nothing else — the admin calendar deliberately does
 *     not carry the member calendar's four-value state. A day with no free
 *     slots is still `open`; it simply has bookings filling it. Rendering
 *     "closed" for a sold-out day would tell an operator the branch was shut.
 *  2. **Occupancy is already a percentage of capacity, not of wall time.** The
 *     server clips booked minutes to the open window and divides by
 *     `open_minutes × concurrency_ceiling`, so a co-working space with twenty
 *     seats never reads above 100%. Never re-derive it client-side from
 *     `booked_minutes / open_minutes`: that formula is wrong for every
 *     multi-occupant space.
 */

/** Whether the branch was open on a calendar cell's date. */
export type CalendarDayState = "open" | "closed"

/** Which period the calendar spans. `week` runs Sunday–Saturday. */
export type CalendarView = "day" | "week" | "month"

/**
 * The six states a booking can hold. Mirrors the backend `BookingStatus` enum.
 *
 * **Changed 2026-10-03** — was four (`confirmed | pending | cancelled |
 * rejected`). The backend now writes a booking's outcome once its time has
 * passed (ADDCore `docs/decisions/booking-outcomes-and-extension.md`):
 * `completed` at checkout, `no_show` when it ended with nobody checked in. An
 * undecided `pending` request lapses to `rejected` when it starts, so no new
 * value covers that. `completed` may still be unpaid; a `no_show` owes
 * nothing that was not already paid.
 */
export type BookingStatus = "confirmed" | "pending" | "completed" | "no_show" | "cancelled" | "rejected"

/** Whether a booking has been settled. */
export type BookingPaymentState = "paid" | "unpaid"

/** How a settled booking was paid. `null` while unpaid. */
export type BookingPaymentSource = "wallet" | "cash"

/** The same values at runtime, for filter controls that enumerate them. */
export const BOOKING_STATUSES: readonly BookingStatus[] = ["confirmed", "pending", "completed", "no_show", "cancelled", "rejected"]
export const BOOKING_PAYMENT_STATES: readonly BookingPaymentState[] = ["paid", "unpaid"]
export const CALENDAR_VIEWS: readonly CalendarView[] = ["day", "week", "month"]

/** One open/close pair. A day can carry several — e.g. a midday closure. */
export interface BusinessHourPeriod {
	open_time: string
	close_time: string
}

/**
 * The member on a booking. Present on calendar cells and index rows alike, so
 * an operator can see who to call without opening the booking.
 */
export interface BookingMember {
	id: number | null
	name: string | null
	phone: string | null
}

/** One booking inside a calendar cell. */
export interface CalendarBooking {
	id: number
	/** ISO-8601 with the district's offset, e.g. "2026-08-17T14:00:00+03:00". */
	start_at: string
	end_at: string
	/**
	 * Pre-formatted 12-hour labels, e.g. "02:00 PM". Server-rendered, so the
	 * calendar and the booking detail can never disagree about a time's wording.
	 */
	start_time: string
	end_time: string
	status: BookingStatus
	/** Already translated by the server against the request's `lang` header. */
	status_label: string
	payment_state: BookingPaymentState
	checked_in_at: string | null
	/** When the member left; null while still inside, or never arrived. */
	checked_out_at: string | null
	member: BookingMember
}

/**
 * How full one space was on one date.
 *
 * `percent` is the authoritative figure — see the file note above for why it
 * is not `booked_minutes / open_minutes`.
 */
export interface CalendarOccupancy {
	booked_minutes: number
	open_minutes: number
	percent: number
}

/** One cell: a single space on a single date. */
export interface CalendarDay {
	/** `YYYY-MM-DD`, in district-local dates. */
	date: string
	/** Short weekday, e.g. "MON". Server-rendered in the request's locale. */
	weekday: string
	/** Zero-padded day of month, e.g. "17". */
	day: string
	state: CalendarDayState
	/** Empty on a closed day. */
	periods: BusinessHourPeriod[]
	occupancy: CalendarOccupancy
	bookings: CalendarBooking[]
}

/** The space a calendar row belongs to. */
export interface CalendarSpace {
	id: number
	/** Translated space name, or `null` when the space has no name set. */
	title: string | null
	space_type: SpaceType
	capacity: number | null
	/**
	 * How many bookings may hold the same window at once — `capacity` for a
	 * co-working space, `1` for everything else. This is the denominator behind
	 * `occupancy.percent`, surfaced so a reader can see why four concurrent
	 * bookings on a four-seat space read as one space's worth of occupancy.
	 */
	concurrency_ceiling: number
	status: string
	requires_approval: boolean
}

/** One row of the calendar: a space, and a cell per day in the range. */
export interface CalendarResource {
	space: CalendarSpace
	days: CalendarDay[]
}

/** One day the branch is closed all day. */
export interface UpcomingClosure {
	/** District-local date, `YYYY-MM-DD`. */
	date: string
	/** The exception's own explanation, when it was given one. */
	reason: string | null
}

/** The branch-hours card above the grid. */
export interface CalendarBranchHours {
	title: string
	/** e.g. "8:00 AM – 8:00 PM". `null` when the anchor date is closed. */
	hours: string | null
	open_time: string | null
	close_time: string | null
	periods: BusinessHourPeriod[]
	/** e.g. "Sunday – Thursday", or a comma list when the open days are not contiguous. */
	days_label: string | null
	open_weekdays: string[]
	/**
	 * Every all-day closure (a business-hour exception with `is_closed`) from
	 * the district's today on, in date order — not limited to the range this
	 * response covers, so a date picker can refuse a holiday in a month the
	 * calendar has not loaded. A day that is only shortened is not listed.
	 */
	upcoming_closures: UpcomingClosure[]
	timezone: string
	/**
	 * e.g. "GMT+3". Derived by the server at request time rather than stored,
	 * because Damascus observes DST — render this, never a constant.
	 */
	timezone_label: string
	timezone_note: string
}

/** Totals across every space in the range. */
export interface CalendarTotals {
	spaces: number
	bookings: number
	occupancy_percent: number
	/** Keyed by `BookingStatus`; an absent key means zero of that status. */
	by_status: Partial<Record<BookingStatus, number>>
}

export interface CalendarRange {
	from: string
	to: string
	timezone: string
}

export interface CalendarMeta {
	view: CalendarView
	date: string
	branch_id: number | null
	spaces: number
}

/**
 * How far ahead, and how soon, a booking may start. Global settings, so one
 * block per response rather than one per space.
 */
export interface BookingWindow {
	/**
	 * The shortest booking, in minutes; there is no longest. Read here once,
	 * as the member app reads it once from the space details — the day's slots
	 * carry no rules.
	 */
	min_duration_minutes: number
	/** A booking must be made at least this long before it starts; 0 = none. */
	min_notice_minutes: number
	/** At most this many days from today; `null` = no limit. */
	max_days_ahead: number | null
}

/**
 * `GET /api/v1/admin/calendar`.
 *
 * `branch_hours` and `booking_window` are `null` when no space matched the
 * filters — there is no branch to state hours for. The grid shows its own
 * empty state in that case rather than an hours card describing nothing.
 */
export interface CalendarResponse {
	view: CalendarView
	range: CalendarRange
	branch_hours: CalendarBranchHours | null
	booking_window: BookingWindow | null
	resources: CalendarResource[]
	totals: CalendarTotals
	meta: CalendarMeta
}

/** One row of `GET /api/v1/admin/bookings`. */
export interface AdminBooking {
	id: number
	space: {
		id: number | null
		title: string | null
		space_type: SpaceType | null
		branch: string | null
	}
	member: BookingMember
	/** ISO-8601. Unlike the calendar's, these carry a `+00:00` offset. */
	start_at: string
	end_at: string
	status: BookingStatus
	status_label: string
	payment_state: BookingPaymentState
	payment_source: BookingPaymentSource | null
	/**
	 * Decimal string, or `null` until the booking is checked out — the server
	 * writes it at settlement, not at creation. A row showing a dash here is
	 * normal for an upcoming booking, not missing data.
	 */
	amount_owed: string | null
	currency: string | null
	checked_in_at: string | null
	checked_out_at: string | null
	note: string | null
	rejection_reason: string | null
	created_at: string | null
}

/** Query accepted by `GET /api/v1/admin/bookings`. Every field is optional. */
export interface AdminBookingFilters {
	status?: BookingStatus
	payment_state?: BookingPaymentState
	space_id?: number
	branch_id?: number
	user_id?: number
	/** `YYYY-MM-DD`, compared against the booking's own `start_at`, not `created_at`. */
	from?: string
	to?: string
	/** Matches the member's name or phone. */
	q?: string
}

/** Query accepted by `GET /api/v1/admin/calendar`. */
export interface CalendarFilters {
	view?: CalendarView
	/** Any date inside the period to show; the server expands it to the range. */
	date?: string
	branch_id?: number
	space_id?: number
	space_type?: SpaceType
	/**
	 * Only this member's bookings are listed and counted; each cell's
	 * occupancy stays the space's own, from every booking.
	 */
	member_id?: number
}
