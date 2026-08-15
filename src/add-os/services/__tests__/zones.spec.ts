import { beforeEach, describe, expect, it, vi } from "vitest"

import { createZone, getZone, listZones, removeZone, updateZone } from "../zones"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const sampleZone = { id: 1, floor_id: 1, label: "Zone A", sort_order: 0 }

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("zones service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("listZones GETs the collection with no filter by default", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleZone] }))

		const zones = await listZones()

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/zones", expect.objectContaining({ method: "GET" }))
		expect(zones).toEqual([sampleZone])
	})

	it("listZones(floorId) appends ?floor_id=", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleZone] }))

		await listZones(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/zones?floor_id=1", expect.objectContaining({ method: "GET" }))
	})

	it("createZone POSTs the payload and unwraps the created resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleZone }, 201))

		const payload = { floor_id: 1, label: "Zone A", sort_order: 0 }
		const zone = await createZone(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/zones",
			expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
		)
		expect(zone).toEqual(sampleZone)
	})

	it("getZone GETs a single resource by id", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleZone }))

		const zone = await getZone(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/zones/1", expect.objectContaining({ method: "GET" }))
		expect(zone).toEqual(sampleZone)
	})

	it("updateZone PUTs the payload and returns the message body only", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Updated." }))

		const payload = { floor_id: 1, label: "Zone A2", sort_order: 1 }
		const result = await updateZone(1, payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/zones/1",
			expect.objectContaining({ method: "PUT", body: JSON.stringify(payload) })
		)
		expect(result).toEqual({ message: "Updated." })
	})

	it("removeZone DELETEs the resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Deleted." }))

		const result = await removeZone(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/zones/1", expect.objectContaining({ method: "DELETE" }))
		expect(result).toEqual({ message: "Deleted." })
	})
})
