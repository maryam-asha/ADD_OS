import { beforeEach, describe, expect, it, vi } from "vitest"
import { listSettings, updateSetting } from "../settings"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const sampleSetting = {
	key: "site.maintenance_mode",
	type: "boolean" as const,
	value: false,
	updated_at: "2026-09-03T10:00:00Z"
}

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("settings service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("listSettings GETs settings collection", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleSetting] }))

		const settings = await listSettings()

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/settings",
			expect.objectContaining({ method: "GET" })
		)
		expect(settings).toEqual([sampleSetting])
	})

	it("updateSetting PATCHes the encoded key with value", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Setting updated." }))

		const res = await updateSetting("site.maintenance_mode", true)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/settings/site.maintenance_mode",
			expect.objectContaining({ method: "PATCH", body: JSON.stringify({ value: true }) })
		)
		expect(res).toEqual({ message: "Setting updated." })
	})
})
