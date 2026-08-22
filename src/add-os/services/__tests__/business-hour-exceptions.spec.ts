import { beforeEach, describe, expect, it, vi } from "vitest"

import {
	createBusinessHourException,
	getBusinessHourException,
	listBusinessHourExceptions,
	removeBusinessHourException,
	updateBusinessHourException
} from "../business-hour-exceptions"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const sampleException = {
	id: 1,
	branch_id: 1,
	date: "2026-12-25",
	is_closed: true,
	open_time: null,
	close_time: null,
	reason: "Holiday"
}

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("business-hour-exceptions service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("listBusinessHourExceptions GETs the collection with a branch_id filter", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleException] }))

		const exceptions = await listBusinessHourExceptions({ branch_id: 1 })

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/business-hour-exceptions?branch_id=1",
			expect.objectContaining({ method: "GET" })
		)
		expect(exceptions).toEqual([sampleException])
	})

	it("createBusinessHourException POSTs the payload and unwraps the created resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleException }, 201))

		const payload = { branch_id: 1, date: "2026-12-25", is_closed: true, open_time: null, close_time: null, reason: "Holiday" }
		const exception = await createBusinessHourException(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/business-hour-exceptions",
			expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
		)
		expect(exception).toEqual(sampleException)
	})

	it("getBusinessHourException GETs a single resource by id", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleException }))

		const exception = await getBusinessHourException(1)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/business-hour-exceptions/1",
			expect.objectContaining({ method: "GET" })
		)
		expect(exception).toEqual(sampleException)
	})

	it("updateBusinessHourException PUTs the payload and returns the message body only", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "تم تحديث استثناء ساعات العمل." }))

		const result = await updateBusinessHourException(1, {
			branch_id: 1,
			date: "2026-12-25",
			is_closed: true,
			open_time: null,
			close_time: null,
			reason: "Holiday (updated)"
		})

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/business-hour-exceptions/1",
			expect.objectContaining({ method: "PUT" })
		)
		expect(result).toEqual({ message: "تم تحديث استثناء ساعات العمل." })
	})

	it("removeBusinessHourException DELETEs the resource", async () => {
		vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))

		await removeBusinessHourException(1)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/business-hour-exceptions/1",
			expect.objectContaining({ method: "DELETE" })
		)
	})
})
