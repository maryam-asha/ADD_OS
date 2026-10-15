import { beforeEach, describe, expect, it, vi } from "vitest"
import { ApiError } from "../api"
import { createCoupon, deleteCoupon, getCoupon, listCouponRedemptions, listCoupons, setCouponActive, updateCoupon } from "../coupons"

vi.mock("@/add-os/config/env", () => ({ apiUrl: () => "http://api.test" }))

function jsonResponse(body: unknown, status = 200) {
	return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

const detail = {
	id: 7,
	code: "VIP",
	name: null,
	description: null,
	source: "admin",
	discount_type: "amount_off",
	discount_value: 50,
	max_discount_points: null,
	min_amount_points: null,
	combinable_with_offers: false,
	usage_limit: null,
	per_user_limit: 1,
	new_members_only: false,
	company_id: 3,
	starts_at: "2026-10-05T06:00:00.000000Z",
	ends_at: null,
	is_active: true,
	used: 2,
	targets: [],
	user_ids: [4, 9],
	created_by: 1,
	created_at: "2026-10-05T05:00:00.000000Z"
}

describe("coupons service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("lists a page with its filters and keeps the meta", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [detail], meta: { current_page: 2, last_page: 3, per_page: 20, total: 41 } }))
		const page = await listCoupons({ search: "VI", state: "running", is_active: 1, page: 2, per_page: 20 })
		const url = String(vi.mocked(fetch).mock.calls[0][0])
		expect(url).toContain("http://api.test/api/v1/admin/coupons?")
		for (const part of ["search=VI", "state=running", "is_active=1", "page=2", "per_page=20"]) expect(url).toContain(part)
		expect(page.meta.total).toBe(41)
	})

	it("reads an empty list sent as {} as no rows", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: {} }))
		expect((await listCoupons()).data).toEqual([])
	})

	it("gets one coupon", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: detail }))
		expect(await getCoupon(7)).toEqual(detail)
		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/coupons/7", expect.objectContaining({ method: "GET" }))
	})

	it("pages the redemption log", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [], meta: { current_page: 1, last_page: 1, total: 0 } }))
		await listCouponRedemptions(7, { page: 1, per_page: 10 })
		expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain("/api/v1/admin/coupons/7/redemptions?")
	})

	it("creates and updates with the full body", async () => {
		const { id: _i, source: _s, used: _u, created_by: _c, created_at: _a, ...payload } = detail
		vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ data: detail }, 201))
		await createCoupon(payload as never)
		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/coupons", expect.objectContaining({ method: "POST", body: JSON.stringify(payload) }))
		vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ message: "Saved." }))
		expect(await updateCoupon(7, payload as never)).toEqual({ message: "Saved." })
		expect(fetch).toHaveBeenLastCalledWith("http://api.test/api/v1/admin/coupons/7", expect.objectContaining({ method: "PUT" }))
	})

	it("surfaces a 409 on delete with the server message", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "This code has been used." }, 409))
		const caught = await deleteCoupon(7).catch(error => error)
		expect(caught).toBeInstanceOf(ApiError)
		expect(caught.status).toBe(409)
		expect(caught.data.message).toBe("This code has been used.")
	})

	it("deletes with 204", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse(null, 204))
		await expect(deleteCoupon(7)).resolves.toBeUndefined()
	})

	it("sets active by sending is_active alone", async () => {
		vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ message: "Saved." }))
		await setCouponActive(7, false)
		const [url, init] = vi.mocked(fetch).mock.calls[0]
		expect(url).toBe("http://api.test/api/v1/admin/coupons/7")
		expect((init as RequestInit).method).toBe("PATCH")
		expect(JSON.parse(String((init as RequestInit).body))).toEqual({ is_active: false })
	})
})
