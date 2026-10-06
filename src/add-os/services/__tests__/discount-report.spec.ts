import { afterEach, describe, expect, it, vi } from "vitest"
import { getDiscountReport } from "../discount-report"

vi.mock("@/add-os/config/env", () => ({ apiUrl: () => "http://api.test" }))

/**
 * GET admin/reports/discounts — pinned collection 2026-10-06, `Reports /
 * Discount Report`. Rows, the paginator, and `meta.totals` over the counted
 * operations only.
 */
const totals = { operations: 1, list_points: 200, final_points: 136, points_by_kind: { offer: 40, plan_discount: 0, coupon: 24 }, saving_points: 0, effective_percent: 32 }

function respond(body: unknown) {
	return vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } }))
}

afterEach(() => vi.restoreAllMocks())

describe("getDiscountReport", () => {
	it("sends only the filters that are set", async () => {
		const fetchMock = respond({ data: [], meta: { current_page: 1, per_page: 20, total: 0, last_page: 1, totals } })

		await getDiscountReport({ from: "2026-10-01", to: "2026-10-31", kind: null, purpose: "booking", status: null, page: 2, per_page: 20 })

		const url = new URL(String(fetchMock.mock.calls[0][0]))
		expect(url.pathname).toBe("/api/v1/admin/reports/discounts")
		expect(Object.fromEntries(url.searchParams)).toEqual({ from: "2026-10-01", to: "2026-10-31", purpose: "booking", page: "2", per_page: "20" })
	})

	it("returns the rows, the page and the totals as the server sent them", async () => {
		const row = { record: { type: "booking", id: 812, reference: "BK-2026-00812" }, member: null, purpose: "booking", at: "2026-10-06T10:00:00Z", status: "confirmed", counted: true, list_points: 200, final_points: 136, discounts: [], saving: null }
		respond({ data: [row], meta: { current_page: 1, per_page: 20, total: 1, last_page: 1, totals } })

		const report = await getDiscountReport({ from: null, to: null, kind: null, purpose: null, status: null, page: 1, per_page: 20 })

		expect(report.data).toEqual([row])
		expect(report.total).toBe(1)
		expect(report.totals).toEqual(totals)
	})
})
