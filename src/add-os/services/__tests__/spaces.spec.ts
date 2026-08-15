import { beforeEach, describe, expect, it, vi } from "vitest"

import { createSpace, getSpace, listSpaces, removeSpace, updateSpace, updateSpaceStatus } from "../spaces"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const sampleSpace = {
	id: 1,
	building_id: 1,
	zone_id: 1,
	space_type: "co_space" as const,
	allocation_model: "open",
	is_lockable: false,
	capacity: 20,
	hourly_rate: null,
	pricing_currency: null,
	status: "active" as const,
	status_reason: null
}

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("spaces service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("listSpaces GETs the collection with no filter by default", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleSpace] }))

		const spaces = await listSpaces()

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/spaces", expect.objectContaining({ method: "GET" }))
		expect(spaces).toEqual([sampleSpace])
	})

	it("listSpaces(filter) appends building_id and/or zone_id independently", async () => {
		vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ data: [sampleSpace] }))

		await listSpaces({ building_id: 1 })

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/spaces?building_id=1",
			expect.objectContaining({ method: "GET" })
		)

		// A fresh Response per call: each Response body is a stream that can only be
		// read once, and `request()` in api.ts always calls `res.text()` — reusing
		// one mockResolvedValue Response object across two awaited calls throws
		// "Body is unusable: Body has already been read" on the second call.
		vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ data: [sampleSpace] }))

		await listSpaces({ building_id: 1, zone_id: 2 })

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/spaces?building_id=1&zone_id=2",
			expect.objectContaining({ method: "GET" })
		)
	})

	it("createSpace POSTs the payload and unwraps the created resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleSpace }, 201))

		const payload = {
			building_id: 1,
			zone_id: 1,
			space_type: "co_space" as const,
			allocation_model: "open",
			is_lockable: false,
			capacity: 20,
			hourly_rate: null,
			pricing_currency: null
		}
		const space = await createSpace(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/spaces",
			expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
		)
		expect(space).toEqual(sampleSpace)
	})

	it("getSpace GETs a single resource by id", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleSpace }))

		const space = await getSpace(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/spaces/1", expect.objectContaining({ method: "GET" }))
		expect(space).toEqual(sampleSpace)
	})

	it("updateSpace PUTs the payload (never status fields) and returns the message body only", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Updated." }))

		const payload = {
			building_id: 1,
			zone_id: null,
			space_type: "room" as const,
			allocation_model: null,
			is_lockable: true,
			capacity: 4,
			hourly_rate: 5,
			pricing_currency: "USD" as const
		}
		const result = await updateSpace(1, payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/spaces/1",
			expect.objectContaining({ method: "PUT", body: JSON.stringify(payload) })
		)
		expect(result).toEqual({ message: "Updated." })
	})

	it("removeSpace DELETEs the resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Deleted." }))

		const result = await removeSpace(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/spaces/1", expect.objectContaining({ method: "DELETE" }))
		expect(result).toEqual({ message: "Deleted." })
	})

	it("updateSpaceStatus PATCHes the status endpoint with status + status_reason", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Status updated." }))

		const payload = { status: "maintenance" as const, status_reason: "Carpet replacement" }
		const result = await updateSpaceStatus(1, payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/spaces/1/status",
			expect.objectContaining({ method: "PATCH", body: JSON.stringify(payload) })
		)
		expect(result).toEqual({ message: "Status updated." })
	})
})
