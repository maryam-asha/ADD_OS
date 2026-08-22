import { beforeEach, describe, expect, it, vi } from "vitest"

import { createBusinessHour, getBusinessHour, listBusinessHours, removeBusinessHour, updateBusinessHour } from "../business-hours"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const sampleHour = { id: 1, branch_id: 1, day_of_week: "monday" as const, open_time: "08:00", close_time: "17:00" }

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("business-hours service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("listBusinessHours GETs the collection with a branch_id filter", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleHour] }))

		const hours = await listBusinessHours({ branch_id: 1 })

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/business-hours?branch_id=1",
			expect.objectContaining({ method: "GET" })
		)
		expect(hours).toEqual([sampleHour])
	})

	it("createBusinessHour POSTs the payload and unwraps the created resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleHour }, 201))

		const payload = { branch_id: 1, day_of_week: "monday" as const, open_time: "08:00", close_time: "17:00" }
		const hour = await createBusinessHour(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/business-hours",
			expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
		)
		expect(hour).toEqual(sampleHour)
	})

	it("getBusinessHour GETs a single resource by id", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleHour }))

		const hour = await getBusinessHour(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/business-hours/1", expect.objectContaining({ method: "GET" }))
		expect(hour).toEqual(sampleHour)
	})

	it("updateBusinessHour PUTs the payload and returns the message body only", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "تم تحديث ساعات العمل." }))

		const result = await updateBusinessHour(1, { branch_id: 1, day_of_week: "monday", open_time: "09:00", close_time: "18:00" })

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/business-hours/1", expect.objectContaining({ method: "PUT" }))
		expect(result).toEqual({ message: "تم تحديث ساعات العمل." })
	})

	it("removeBusinessHour DELETEs the resource", async () => {
		vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))

		await removeBusinessHour(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/business-hours/1", expect.objectContaining({ method: "DELETE" }))
	})
})
