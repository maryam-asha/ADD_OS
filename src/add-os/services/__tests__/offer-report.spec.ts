import { afterEach, describe, expect, it, vi } from "vitest"
import { getOfferReport } from "../offer-report"

vi.mock("@/add-os/config/env", () => ({ apiUrl: () => "http://api.test" }))

/**
 * GET admin/reports/offers — pinned collection 2026-10-07, `Reports / Offer
 * Report`. A plain list, not paginated: the offers that ran in the period.
 */
function respond(body: unknown) {
	// A fresh Response per call: a body can be read once.
	return vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } }))
}

afterEach(() => vi.restoreAllMocks())

describe("getOfferReport", () => {
	it("asks for the period, and for coupons only when asked", async () => {
		const fetchMock = respond({ data: [] })

		await getOfferReport({ from: "2026-10-01", to: "2026-10-31", type: "offer" })
		await getOfferReport({ from: "2026-10-01", to: "2026-10-31", type: "coupon" })

		const first = new URL(String(fetchMock.mock.calls[0][0]))
		expect(first.pathname).toBe("/api/v1/admin/reports/offers")
		expect(Object.fromEntries(first.searchParams)).toEqual({ from: "2026-10-01", to: "2026-10-31" })
		expect(Object.fromEntries(new URL(String(fetchMock.mock.calls[1][0])).searchParams)).toEqual({ from: "2026-10-01", to: "2026-10-31", type: "coupon" })
	})

	it("returns the offers as the server sent them", async () => {
		const offer = { id: 12, name: "Rooms week", code: null, deleted: false, periods: [], operations: 14, points: 560 }
		respond({ data: [offer] })

		expect(await getOfferReport({ from: "2026-10-01", to: "2026-10-31", type: "offer" })).toEqual([offer])
	})
})
