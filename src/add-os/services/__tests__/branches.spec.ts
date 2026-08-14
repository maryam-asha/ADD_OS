import { beforeEach, describe, expect, it, vi } from "vitest"

import { createBranch, getBranch, listBranches, removeBranch, updateBranch } from "../branches"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const sampleBranch = {
	id: 1,
	name: { ar: "الفرع الرئيسي", en: "Main Branch" },
	city: { ar: "حلب", en: "Aleppo" },
	timezone: "Asia/Damascus",
	is_active: true
}

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("branches service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("listBranches GETs the collection and unwraps it", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleBranch] }))

		const branches = await listBranches()

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/branches", expect.objectContaining({ method: "GET" }))
		expect(branches).toEqual([sampleBranch])
	})

	it("createBranch POSTs the payload and unwraps the created resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleBranch }, 201))

		const payload = { name: sampleBranch.name, city: sampleBranch.city, timezone: sampleBranch.timezone, is_active: true }
		const branch = await createBranch(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/branches",
			expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
		)
		expect(branch).toEqual(sampleBranch)
	})

	it("getBranch GETs a single resource by id", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleBranch }))

		const branch = await getBranch(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/branches/1", expect.objectContaining({ method: "GET" }))
		expect(branch).toEqual(sampleBranch)
	})

	it("updateBranch PUTs the payload and returns the message body only", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Updated." }))

		const payload = { name: sampleBranch.name, city: sampleBranch.city, timezone: "Asia/Riyadh", is_active: true }
		const result = await updateBranch(1, payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/branches/1",
			expect.objectContaining({ method: "PUT", body: JSON.stringify(payload) })
		)
		expect(result).toEqual({ message: "Updated." })
	})

	it("removeBranch DELETEs the resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Deleted." }))

		const result = await removeBranch(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/branches/1", expect.objectContaining({ method: "DELETE" }))
		expect(result).toEqual({ message: "Deleted." })
	})
})
