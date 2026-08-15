import { beforeEach, describe, expect, it, vi } from "vitest"

import { createFloor, getFloor, listFloors, removeFloor, updateFloor } from "../floors"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const sampleFloor = { id: 1, building_id: 1, label: "1", sort_order: 0 }

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("floors service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("listFloors GETs the collection with no filter by default", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleFloor] }))

		const floors = await listFloors()

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/floors", expect.objectContaining({ method: "GET" }))
		expect(floors).toEqual([sampleFloor])
	})

	it("listFloors(buildingId) appends ?building_id=", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleFloor] }))

		await listFloors(1)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/floors?building_id=1",
			expect.objectContaining({ method: "GET" })
		)
	})

	it("createFloor POSTs the payload and unwraps the created resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleFloor }, 201))

		const payload = { building_id: 1, label: "1", sort_order: 0 }
		const floor = await createFloor(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/floors",
			expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
		)
		expect(floor).toEqual(sampleFloor)
	})

	it("getFloor GETs a single resource by id", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleFloor }))

		const floor = await getFloor(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/floors/1", expect.objectContaining({ method: "GET" }))
		expect(floor).toEqual(sampleFloor)
	})

	it("updateFloor PUTs the payload and returns the message body only", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Updated." }))

		const payload = { building_id: 1, label: "1", sort_order: 1 }
		const result = await updateFloor(1, payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/floors/1",
			expect.objectContaining({ method: "PUT", body: JSON.stringify(payload) })
		)
		expect(result).toEqual({ message: "Updated." })
	})

	it("removeFloor DELETEs the resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Deleted." }))

		const result = await removeFloor(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/floors/1", expect.objectContaining({ method: "DELETE" }))
		expect(result).toEqual({ message: "Deleted." })
	})
})
