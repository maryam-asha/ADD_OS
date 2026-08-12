import { beforeEach, describe, expect, it, vi } from "vitest"

import { listRoles } from "../roles"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

describe("listRoles", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("sends a GET request to the roles endpoint and unwraps the data envelope", async () => {
		vi.mocked(fetch).mockResolvedValue(
			new Response(JSON.stringify({ data: ["member", "operations", "admin"] }), {
				status: 200,
				headers: { "content-type": "application/json" }
			})
		)

		const roles = await listRoles()

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/roles", expect.objectContaining({ method: "GET" }))
		expect(roles).toEqual(["member", "operations", "admin"])
	})

	it("propagates ApiError on a 403", async () => {
		vi.mocked(fetch).mockResolvedValue(
			new Response(JSON.stringify({ message: "This action is unauthorized." }), {
				status: 403,
				headers: { "content-type": "application/json" }
			})
		)

		await expect(listRoles()).rejects.toMatchObject({ status: 403 })
	})
})
