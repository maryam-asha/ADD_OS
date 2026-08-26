import { beforeEach, describe, expect, it, vi } from "vitest"

import {
	approveBooking,
	cancelBooking,
	checkOutSession,
	confirmArrivalRequest,
	extendBooking,
	listActiveSessions,
	listArrivalRequests,
	listPendingApprovals,
	rejectArrivalRequest,
	rejectBooking,
	settleSessionPayment
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

const arrivalRow = {
	id: 4,
	status: "pending" as const,
	requested_at: "2026-08-26T09:15:00+03:00",
	matched_booking_id: null,
	user: { id: 12, name: "Sara", phone: "0900000000" },
	matched_booking: null
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

	describe("arrival requests", () => {
		it("lists from the arrival-requests path and keeps the backend's meta", async () => {
			vi.spyOn(globalThis, "fetch").mockResolvedValue(
				jsonResponse({ data: [arrivalRow], meta: { current_page: 2, last_page: 5, per_page: 25, total: 112 } })
			)

			const page = await listArrivalRequests({ page: 2 })

			expect(calledUrl()).toBe(`${BASE}/arrival-requests?page=2`)
			expect(page.data).toEqual([arrivalRow])
			expect(page.meta.last_page).toBe(5)
			expect(page.meta.total).toBe(112)
		})

		/**
		 * The distinction this whole screen turns on. A matched request is checked
		 * into its own booking by the backend, so a body would be meaningless — and
		 * an unmatched one 422s without `space_id`. Asserting the ABSENCE of a body
		 * is what would fail if someone "helpfully" started always sending one.
		 */
		it("confirms a matched request with no body at all", async () => {
			vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ message: "Arrival confirmed." }))

			await confirmArrivalRequest(4)

			expect(calledUrl()).toBe(`${BASE}/arrival-requests/4/confirm`)
			expect(calledInit().method).toBe("POST")
			expect(calledInit().body).toBeUndefined()
		})

		it("confirms an unmatched request with space_id and nothing else", async () => {
			vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ message: "Walk-in started." }))

			await confirmArrivalRequest(4, 9)

			expect(calledUrl()).toBe(`${BASE}/arrival-requests/4/confirm`)
			expect(JSON.parse(calledInit().body as string)).toEqual({ space_id: 9 })
		})

		it("rejects with no body", async () => {
			vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ message: "Arrival rejected." }))

			await rejectArrivalRequest(4)

			expect(calledUrl()).toBe(`${BASE}/arrival-requests/4/reject`)
			expect(calledInit().method).toBe("POST")
			expect(calledInit().body).toBeUndefined()
		})
	})
})
