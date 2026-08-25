import { beforeEach, describe, expect, it, vi } from "vitest"

import {
	approveBooking,
	cancelBooking,
	checkOutSession,
	extendBooking,
	listActiveSessions,
	listPendingApprovals,
	rejectBooking,
	settleSessionPayment,
	toOffsetIso
} from "../reception"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const BASE = "http://api.test/api/v1/admin/reception"

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

function calledUrl(): string {
	return vi.mocked(fetch).mock.calls[0][0] as string
}

function calledInit(): RequestInit {
	return vi.mocked(fetch).mock.calls[0][1] as RequestInit
}

const pendingRow = {
	id: 1,
	space_id: 5,
	space_type: "event_hall" as const,
	user_id: 12,
	user_name: "Sara",
	start_at: "2026-08-26T09:00:00+03:00",
	end_at: "2026-08-26T11:00:00+03:00",
	created_at: "2026-08-25T08:00:00+03:00"
}

const sessionRow = {
	id: 1,
	type: "booking" as const,
	space_id: 5,
	space_type: "room" as const,
	user_id: 12,
	user_name: "Sara",
	checked_in_at: "2026-08-25T09:00:00+03:00",
	is_overdue: false
}

describe("reception service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	describe("listPendingApprovals", () => {
		it("hits pending-approval and returns the backend's own meta", async () => {
			vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [pendingRow], meta: { current_page: 2, last_page: 4, total: 87 } }))

			const page = await listPendingApprovals()

			expect(calledUrl()).toBe(`${BASE}/bookings/pending-approval`)
			expect(calledInit().method).toBe("GET")
			expect(page.data).toEqual([pendingRow])
			expect(page.meta.current_page).toBe(2)
			expect(page.meta.last_page).toBe(4)
			expect(page.meta.total).toBe(87)
		})

		it("passes the requested page through as a query parameter", async () => {
			vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [], meta: { current_page: 3, last_page: 4, total: 87 } }))

			await listPendingApprovals({ page: 3 })

			expect(calledUrl()).toBe(`${BASE}/bookings/pending-approval?page=3`)
		})
	})

	describe("listActiveSessions", () => {
		it("hits sessions/active and unwraps { data } to a flat array", async () => {
			vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sessionRow] }))

			const sessions = await listActiveSessions()

			expect(calledUrl()).toBe(`${BASE}/sessions/active`)
			expect(sessions).toEqual([sessionRow])
		})
	})

	describe("approval actions", () => {
		it("approveBooking POSTs the approve endpoint with no body", async () => {
			vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Booking approved." }))

			const result = await approveBooking(7)

			expect(calledUrl()).toBe(`${BASE}/bookings/7/approve`)
			expect(calledInit().method).toBe("POST")
			expect(calledInit().body).toBeUndefined()
			expect(result).toEqual({ message: "Booking approved." })
		})

		it("rejectBooking POSTs the reason under rejection_reason", async () => {
			vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Booking rejected." }))

			await rejectBooking(7, "Space closed for maintenance that day.")

			expect(calledUrl()).toBe(`${BASE}/bookings/7/reject`)
			expect(calledInit().body).toBe(JSON.stringify({ rejection_reason: "Space closed for maintenance that day." }))
		})
	})

	describe("booking-only session actions", () => {
		it("cancelBooking POSTs the cancel endpoint with no body", async () => {
			vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Booking cancelled." }))

			await cancelBooking(7)

			expect(calledUrl()).toBe(`${BASE}/bookings/7/cancel`)
			expect(calledInit().body).toBeUndefined()
		})

		it("extendBooking POSTs the minutes under additional_minutes", async () => {
			vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Booking extended." }))

			await extendBooking(7, 60)

			expect(calledUrl()).toBe(`${BASE}/bookings/7/extend`)
			expect(calledInit().body).toBe(JSON.stringify({ additional_minutes: 60 }))
		})
	})

	/**
	 * The whole reason this service exists as one module: booking and walk-in
	 * rows are the same row on screen but hit different URL prefixes. Both arms
	 * are asserted for both shared actions, because getting one right and the
	 * other wrong is exactly the failure that looks fine in a demo where every
	 * row happens to be a booking.
	 */
	describe("type-routed session actions", () => {
		it("checkOutSession routes a booking row to bookings/{id}/check-out", async () => {
			vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Checked out." }))

			await checkOutSession("booking", 7, new Date("2026-08-17T11:00:00+03:00"))

			expect(calledUrl()).toBe(`${BASE}/bookings/7/check-out`)
		})

		it("checkOutSession routes a walkin row to walk-ins/{id}/check-out", async () => {
			vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Checked out." }))

			await checkOutSession("walkin", 7, new Date("2026-08-17T11:00:00+03:00"))

			expect(calledUrl()).toBe(`${BASE}/walk-ins/7/check-out`)
		})

		it("settleSessionPayment routes a booking row to bookings/{id}/settle-payment", async () => {
			vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Payment settled." }))

			await settleSessionPayment("booking", 7, "sham")

			expect(calledUrl()).toBe(`${BASE}/bookings/7/settle-payment`)
			expect(calledInit().body).toBe(JSON.stringify({ payment_method: "sham" }))
		})

		it("settleSessionPayment routes a walkin row to walk-ins/{id}/settle-payment", async () => {
			vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Payment settled." }))

			await settleSessionPayment("walkin", 7, "mtn")

			expect(calledUrl()).toBe(`${BASE}/walk-ins/7/settle-payment`)
			expect(calledInit().body).toBe(JSON.stringify({ payment_method: "mtn" }))
		})

		it("sends the check-out time under checked_out_at and nothing else", async () => {
			vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Checked out." }))
			const at = new Date("2026-08-17T11:00:00+03:00")

			await checkOutSession("walkin", 7, at)

			const body = JSON.parse(calledInit().body as string)
			expect(Object.keys(body)).toEqual(["checked_out_at"])
			expect(new Date(body.checked_out_at).getTime()).toBe(at.getTime())
		})
	})

	/**
	 * The collection's own example is `"2026-08-17T11:00:00+03:00"` — local wall
	 * clock with an explicit offset, not a UTC `Z` string. Asserted structurally
	 * rather than against a literal offset, because the suite runs in whatever
	 * zone the machine is set to; a hardcoded `+03:00` would pass in Damascus and
	 * fail elsewhere without either result meaning anything.
	 */
	describe("toOffsetIso", () => {
		it("emits local wall-clock time with an explicit UTC offset", () => {
			const at = new Date(2026, 7, 17, 11, 0, 0)

			expect(toOffsetIso(at)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/)
			expect(toOffsetIso(at).startsWith("2026-08-17T11:00:00")).toBe(true)
		})

		it("round-trips to the same instant it was given", () => {
			const at = new Date(2026, 0, 3, 7, 5, 9)

			expect(new Date(toOffsetIso(at)).getTime()).toBe(at.getTime())
		})

		it("zero-pads every component", () => {
			expect(toOffsetIso(new Date(2026, 0, 3, 7, 5, 9)).slice(0, 19)).toBe("2026-01-03T07:05:09")
		})
	})
})
