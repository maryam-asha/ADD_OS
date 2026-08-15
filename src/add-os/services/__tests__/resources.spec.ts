import { beforeEach, describe, expect, it, vi } from "vitest"

import { createResource, getResource, listResources, removeResource, updateResource, updateResourceStatus } from "../resources"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const sampleResource = {
	id: 1,
	space_id: 1,
	name: "Projector",
	category: "projector",
	quantity: 1,
	status: "active" as const,
	status_reason: null
}

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("resources service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("listResources GETs the collection with no filter by default", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleResource] }))

		const resources = await listResources()

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/resources", expect.objectContaining({ method: "GET" }))
		expect(resources).toEqual([sampleResource])
	})

	it("listResources(spaceId) appends ?space_id=", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleResource] }))

		await listResources(1)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/resources?space_id=1",
			expect.objectContaining({ method: "GET" })
		)
	})

	it("createResource POSTs the payload and unwraps the created resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleResource }, 201))

		const payload = { space_id: 1, name: "Projector", category: "projector", quantity: 1 }
		const resource = await createResource(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/resources",
			expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
		)
		expect(resource).toEqual(sampleResource)
	})

	it("getResource GETs a single resource by id", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleResource }))

		const resource = await getResource(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/resources/1", expect.objectContaining({ method: "GET" }))
		expect(resource).toEqual(sampleResource)
	})

	it("updateResource PUTs the payload (never status fields) and returns the message body only", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Updated." }))

		const payload = { space_id: 1, name: "Projector HD", category: "projector", quantity: 2 }
		const result = await updateResource(1, payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/resources/1",
			expect.objectContaining({ method: "PUT", body: JSON.stringify(payload) })
		)
		expect(result).toEqual({ message: "Updated." })
	})

	it("removeResource DELETEs the resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Deleted." }))

		const result = await removeResource(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/resources/1", expect.objectContaining({ method: "DELETE" }))
		expect(result).toEqual({ message: "Deleted." })
	})

	it("updateResourceStatus PATCHes the status endpoint with status + status_reason only", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Status updated." }))

		const payload = { status: "retired" as const, status_reason: "Broken bulb" }
		const result = await updateResourceStatus(1, payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/resources/1/status",
			expect.objectContaining({ method: "PATCH", body: JSON.stringify(payload) })
		)
		expect(result).toEqual({ message: "Status updated." })
	})
})
