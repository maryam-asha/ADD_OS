import { beforeEach, describe, expect, it, vi } from "vitest"
import { createPlanModule, getPlanModule, listPlanModules, removePlanModule, updatePlanModule } from "../plan-modules"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const sampleModule = {
	id: 1,
	name: { ar: "مكتب مرن", en: "Flexi Desk" },
	slug: "flexi-desk",
	description: { ar: "وصف مرن", en: "Flexi description" },
	icon: "carbon:workspace",
	order: 1,
	is_active: true,
	plans_count: 3
}

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("plan-modules service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("listPlanModules GETs the collection and unwraps it", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleModule] }))

		const modules = await listPlanModules()

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/plan-modules", expect.objectContaining({ method: "GET" }))
		expect(modules).toEqual([sampleModule])
	})

	it("createPlanModule POSTs payload and unwraps the created resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleModule }, 201))

		const payload = {
			name: sampleModule.name,
			slug: sampleModule.slug,
			order: 1,
			is_active: true
		}
		const mod = await createPlanModule(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/plan-modules",
			expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
		)
		expect(mod).toEqual(sampleModule)
	})

	it("getPlanModule GETs a single resource by id", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleModule }))

		const mod = await getPlanModule(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/plan-modules/1", expect.objectContaining({ method: "GET" }))
		expect(mod).toEqual(sampleModule)
	})

	it("updatePlanModule PUTs the payload and returns the message body only", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "تم تحديث القسم." }))

		const result = await updatePlanModule(1, {
			name: sampleModule.name,
			order: 2
		})

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/plan-modules/1", expect.objectContaining({ method: "PUT" }))
		expect(result).toEqual({ message: "تم تحديث القسم." })
	})

	it("removePlanModule DELETEs the resource", async () => {
		vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))

		await removePlanModule(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/plan-modules/1", expect.objectContaining({ method: "DELETE" }))
	})
})
