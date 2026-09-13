import { beforeEach, describe, expect, it, vi } from "vitest"
import { createEventCategory, getEventCategory, listEventCategories, removeEventCategory, updateEventCategory } from "../event-categories"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const sampleCategory = {
	id: 1,
	name: { ar: "ورش عمل", en: "Workshops" },
	slug: "workshops",
	description: { ar: "ورش عمل تقنية", en: "Technical workshops" },
	color: "#FF5733",
	icon: "carbon:education",
	order: 1,
	is_active: true,
	created_at: "2026-09-06T12:00:00Z",
	updated_at: "2026-09-06T12:00:00Z"
}

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("event-categories service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("listEventCategories GETs the collection and unwraps it", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleCategory] }))

		const categories = await listEventCategories()

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/event-categories", expect.objectContaining({ method: "GET" }))
		expect(categories).toEqual([sampleCategory])
	})

	it("getEventCategory GETs a single category by id", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleCategory }))

		const category = await getEventCategory(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/event-categories/1", expect.objectContaining({ method: "GET" }))
		expect(category).toEqual(sampleCategory)
	})

	it("createEventCategory POSTs payload and unwraps created entity", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleCategory }, 201))

		const payload = {
			name: { ar: "ورش عمل", en: "Workshops" },
			slug: "workshops"
		}

		const created = await createEventCategory(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/event-categories",
			expect.objectContaining({ method: "POST" })
		)
		expect(created).toEqual(sampleCategory)
	})

	it("updateEventCategory PUTs payload to /api/v1/admin/event-categories/:id", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Updated" }))

		await updateEventCategory(1, { name: { ar: "محدث", en: "Updated" } })

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/event-categories/1",
			expect.objectContaining({ method: "PUT" })
		)
	})

	it("removeEventCategory DELETEs /api/v1/admin/event-categories/:id", async () => {
		vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))

		await removeEventCategory(1)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/event-categories/1",
			expect.objectContaining({ method: "DELETE" })
		)
	})
})
