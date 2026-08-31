import { beforeEach, describe, expect, it, vi } from "vitest"

import { listPermissionModules } from "../permissions"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const samplePermissionModules = [
	{
		module: "branches",
		actions: [
			{ name: "branches.view", action: "view" },
			{ name: "branches.update", action: "update" },
			{ name: "branches.delete", action: "delete" }
		]
	},
	{
		module: "users",
		actions: [{ name: "users.view", action: "view" }]
	}
]

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("listPermissionModules", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("sends a GET request to the permissions endpoint and unwraps the data envelope", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: samplePermissionModules }))

		const modules = await listPermissionModules()

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/permissions",
			expect.objectContaining({ method: "GET" })
		)
		expect(modules).toEqual(samplePermissionModules)
	})

	it("propagates ApiError on a 403", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "This action is unauthorized." }, 403))

		await expect(listPermissionModules()).rejects.toMatchObject({ status: 403 })
	})
})
