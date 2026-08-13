import { beforeEach, describe, expect, it, vi } from "vitest"

import { createResourceApi } from "../resource-factory"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

interface Widget {
	id: number
	label: string
}

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("createResourceApi", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	const api = createResourceApi<Widget>("/api/v1/admin/widgets")

	it("list() GETs the base endpoint and unwraps { data }", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [{ id: 1, label: "A" }] }))

		const widgets = await api.list()

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/widgets", expect.objectContaining({ method: "GET" }))
		expect(widgets).toEqual([{ id: 1, label: "A" }])
	})

	it("list(query) appends the query string", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [] }))

		await api.list({ parent_id: 5 })

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/widgets?parent_id=5",
			expect.objectContaining({ method: "GET" })
		)
	})

	it("getById() GETs the item endpoint and unwraps { data }", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: { id: 1, label: "A" } }))

		const widget = await api.getById(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/widgets/1", expect.objectContaining({ method: "GET" }))
		expect(widget).toEqual({ id: 1, label: "A" })
	})

	it("create() POSTs the payload and unwraps the created resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: { id: 2, label: "B" } }, 201))

		const widget = await api.create({ label: "B" })

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/widgets",
			expect.objectContaining({ method: "POST", body: JSON.stringify({ label: "B" }) })
		)
		expect(widget).toEqual({ id: 2, label: "B" })
	})

	it("update() PUTs the payload and returns the message body as-is (no resource merge)", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Updated." }))

		const result = await api.update(1, { label: "B2" })

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/widgets/1",
			expect.objectContaining({ method: "PUT", body: JSON.stringify({ label: "B2" }) })
		)
		expect(result).toEqual({ message: "Updated." })
	})

	it("remove() DELETEs the item endpoint", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Deleted." }))

		const result = await api.remove(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/widgets/1", expect.objectContaining({ method: "DELETE" }))
		expect(result).toEqual({ message: "Deleted." })
	})
})
