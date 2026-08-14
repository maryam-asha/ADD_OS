import { beforeEach, describe, expect, it, vi } from "vitest"

import { createBuilding, getBuilding, listBuildings, removeBuilding, updateBuilding } from "../buildings"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const sampleBuilding = { id: 1, branch_id: 1, name: { ar: "المبنى أ", en: "Building A" }, floor_count: 5 }

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("buildings service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("listBuildings GETs the collection with no filter by default", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleBuilding] }))

		const buildings = await listBuildings()

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/buildings", expect.objectContaining({ method: "GET" }))
		expect(buildings).toEqual([sampleBuilding])
	})

	it("listBuildings(branchId) appends ?branch_id=", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleBuilding] }))

		await listBuildings(1)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/buildings?branch_id=1",
			expect.objectContaining({ method: "GET" })
		)
	})

	it("createBuilding POSTs the payload and unwraps the created resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleBuilding }, 201))

		const payload = { branch_id: 1, name: sampleBuilding.name, floor_count: 5 }
		const building = await createBuilding(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/buildings",
			expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
		)
		expect(building).toEqual(sampleBuilding)
	})

	it("getBuilding GETs a single resource by id", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleBuilding }))

		const building = await getBuilding(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/buildings/1", expect.objectContaining({ method: "GET" }))
		expect(building).toEqual(sampleBuilding)
	})

	it("updateBuilding PUTs the payload and returns the message body only", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Updated." }))

		const payload = { branch_id: 1, name: sampleBuilding.name, floor_count: 6 }
		const result = await updateBuilding(1, payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/buildings/1",
			expect.objectContaining({ method: "PUT", body: JSON.stringify(payload) })
		)
		expect(result).toEqual({ message: "Updated." })
	})

	it("removeBuilding DELETEs the resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Deleted." }))

		const result = await removeBuilding(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/buildings/1", expect.objectContaining({ method: "DELETE" }))
		expect(result).toEqual({ message: "Deleted." })
	})
})
