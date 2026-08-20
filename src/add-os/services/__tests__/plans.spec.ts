import { beforeEach, describe, expect, it, vi } from "vitest"

import { createPlan, getPlan, listPlans, removePlan, updatePlan } from "../plans"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const samplePlan = {
	id: 1,
	name: { ar: "خطة شهرية", en: "Monthly Plan" },
	is_subscription: true,
	price: "150.00",
	pricing_currency: "USD" as const,
	duration_days: 30,
	included_hours: "20.00",
	overage_rate: "5.00",
	is_active: true,
	order: 1,
	created_at: "2026-08-20T15:15:35.000000Z"
}

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("plans service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("listPlans GETs the collection and unwraps it", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [samplePlan] }))

		const plans = await listPlans()

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/plans", expect.objectContaining({ method: "GET" }))
		expect(plans).toEqual([samplePlan])
	})

	it("createPlan POSTs a numeric payload and unwraps the created resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: samplePlan }, 201))

		const payload = {
			name: samplePlan.name,
			is_subscription: true,
			price: 150,
			pricing_currency: "USD" as const,
			duration_days: 30,
			included_hours: 20,
			overage_rate: 5,
			is_active: true,
			order: 1
		}
		const plan = await createPlan(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/plans",
			expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
		)
		expect(plan).toEqual(samplePlan)
	})

	it("getPlan GETs a single resource by id", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: samplePlan }))

		const plan = await getPlan(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/plans/1", expect.objectContaining({ method: "GET" }))
		expect(plan).toEqual(samplePlan)
	})

	it("updatePlan PUTs the payload and returns the message body only", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "تم تحديث الباقة." }))

		const result = await updatePlan(1, {
			name: samplePlan.name,
			is_subscription: true,
			price: 175,
			pricing_currency: "USD",
			duration_days: 30,
			included_hours: 25,
			overage_rate: 5,
			is_active: true,
			order: 1
		})

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/plans/1", expect.objectContaining({ method: "PUT" }))
		expect(result).toEqual({ message: "تم تحديث الباقة." })
	})

	it("removePlan DELETEs the resource", async () => {
		vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))

		await removePlan(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/plans/1", expect.objectContaining({ method: "DELETE" }))
	})
})
