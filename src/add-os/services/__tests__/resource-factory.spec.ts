import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

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

	describe("listPage()", () => {
		it("returns data and meta for a paginated response", async () => {
			vi.mocked(fetch).mockResolvedValue(
				jsonResponse({
					data: [{ id: 1, label: "A" }],
					meta: { current_page: 1, last_page: 3, per_page: 20, total: 45 }
				})
			)

			const page = await api.listPage()

			expect(fetch).toHaveBeenCalledWith(
				"http://api.test/api/v1/admin/widgets",
				expect.objectContaining({ method: "GET" })
			)
			expect(page.data).toEqual([{ id: 1, label: "A" }])
			expect(page.meta).toEqual({ current_page: 1, last_page: 3, per_page: 20, total: 45 })
		})

		it("synthesizes a single-page meta when the backend sends none", async () => {
			vi.mocked(fetch).mockResolvedValue(
				jsonResponse({ data: [{ id: 1, label: "A" }, { id: 2, label: "B" }] })
			)

			const page = await api.listPage()

			expect(page.data).toHaveLength(2)
			expect(page.meta).toEqual({ current_page: 1, last_page: 1, per_page: 2, total: 2 })
		})
	})

	describe("list() silent-truncation guard", () => {
		let warnSpy: ReturnType<typeof vi.spyOn>

		beforeEach(() => {
			warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
		})

		afterEach(() => {
			warnSpy.mockRestore()
		})

		it("warns and names the endpoint when the response has more pages than list() exposes", async () => {
			vi.mocked(fetch).mockResolvedValue(
				jsonResponse({
					data: [{ id: 1, label: "A" }],
					meta: { current_page: 1, last_page: 2, per_page: 1, total: 2 }
				})
			)

			const widgets = await api.list()

			expect(widgets).toEqual([{ id: 1, label: "A" }])
			expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("/api/v1/admin/widgets"))
		})

		it("does not warn when there is only one page", async () => {
			vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [{ id: 1, label: "A" }] }))

			await api.list()

			expect(warnSpy).not.toHaveBeenCalled()
		})

		it("does not warn when meta is present but last_page is 1", async () => {
			vi.mocked(fetch).mockResolvedValue(
				jsonResponse({
					data: [{ id: 1, label: "A" }],
					meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 }
				})
			)

			await api.list()

			expect(warnSpy).not.toHaveBeenCalled()
		})
	})
})
