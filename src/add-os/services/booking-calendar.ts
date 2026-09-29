import type { Paginated, RawPaginatedResponse } from "./pagination"
import type { DaySlots } from "@/add-os/modules/booking/types/availability"
import type {
	AdminBooking,
	AdminBookingFilters,
	CalendarFilters,
	CalendarResponse
} from "@/add-os/modules/booking/types/calendar"
import { get } from "./api"
import { toPaginated } from "./pagination"

/**
 * The operations calendar and the general bookings index.
 *
 * Read-only by design. Every write verb on a booking — approve, reject,
 * check-in, check-out, cancel, settle, extend — already lives in
 * `services/reception.ts`, and splitting one booking's actions across two
 * service modules by which screen happens to call them would make "where does
 * cancel live" a question with two answers. A calendar cell that needs an
 * action imports it from `reception.ts`.
 *
 * Not built on `createResourceApi`: neither endpoint is a CRUD verb over a
 * resource. `getCalendar` returns a grid keyed by space and date, and
 * `listBookings` is a filtered read with no create/update/delete siblings on
 * this path at all.
 *
 * Endpoints verified against the API snapshot pinned 2026-09-20
 * (`docs/api/ADD-OS.postman_collection.json` → Admin (Dashboard) → Calendar &
 * Bookings). Both response shapes in this module were **observed** on the wire
 * by the backend and transcribed into its endpoint reference — unusual here,
 * and the reason the types carry field-level notes rather than hedged ones.
 */

const BASE = "/api/v1/admin"

/**
 * The calendar grid: spaces as rows, dates as cells.
 *
 * Returns the whole envelope rather than just `resources`, and that is the
 * point — `totals`, `range` and `branch_hours` are computed server-side from
 * the same business-hours periods the member-facing availability screens use.
 * Recomputing any of them here is how the two surfaces start disagreeing about
 * what "open" means.
 *
 * Not paginated. The response is bounded by the space count and the view
 * length (at most 31 days), and the server loads it in a fixed number of
 * queries regardless of either.
 */
export async function getCalendar(filters?: CalendarFilters): Promise<CalendarResponse> {
	return get<CalendarResponse>(`${BASE}/calendar`, filters as Record<string, unknown> | undefined)
}

/**
 * Paginated — 25 per page, newest `start_at` first.
 *
 * Returns `Paginated`, not `AdminBooking[]`: this table pages, and discarding
 * `meta` would silently show page 1 of N. `toPaginated` tolerates the absent
 * `per_page` that this backend's paginator omits.
 *
 * `from`/`to` filter on the booking's own `start_at`, not on `created_at` —
 * an operator asking what is booked next week means the booking's dates, not
 * when someone happened to make it.
 */
export async function listBookings(query?: Record<string, unknown>): Promise<Paginated<AdminBooking>> {
	const raw = await get<RawPaginatedResponse<AdminBooking>>(`${BASE}/bookings`, query)
	return toPaginated(raw)
}

/**
 * One booking, with the same price breakdown, approval stepper and action
 * flags the member sees on their own copy.
 *
 * That sharing is deliberate on the backend's side: operations and the member
 * read the same computed blocks, so the two can never disagree about what a
 * booking cost or where its approval stands. Typed loosely as `AdminBooking`
 * plus unknown extras until a screen actually renders the stepper — narrowing
 * it now would be typing a shape nothing consumes.
 */
export async function getBooking(id: number): Promise<{ data: AdminBooking & Record<string, unknown> }> {
	return get<{ data: AdminBooking & Record<string, unknown> }>(`${BASE}/bookings/${id}`)
}

/**
 * The cells of one space on one date.
 *
 * The member app's very response — the backend serves both from one
 * `AvailabilityBrowseService` call, and asserts in its own test that the two
 * bodies are identical. That sameness is the point: the desk offers exactly the windows
 * `BookingCreationService` will accept, so an operator stops discovering the
 * rules one rejection at a time.
 *
 * `date` is a district-local calendar date (`YYYY-MM-DD`), not an instant.
 *
 * There is no duration: each cell is one step of the space's granularity,
 * judged on its own, and a booking is a run of them picked first to last. The
 * duration-first flow and its `availability/quote` call are gone from the API.
 */
export async function getSpaceSlots(spaceId: number, date: string): Promise<DaySlots> {
	const response = await get<{ data: DaySlots }>(`${BASE}/spaces/${spaceId}/availability/slots`, { date })
	return response.data
}

/** Re-exported so `AdminBookingFilters` has one import site alongside the calls. */
export type { AdminBookingFilters, CalendarFilters }
