import { beforeEach, describe, expect, it, vi } from "vitest"

import { patch } from "../api"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

describe("patch", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("sends a PATCH request with a JSON body and returns the parsed response", async () => {
		vi.mocked(fetch).mockResolvedValue(
			new Response(JSON.stringify({ data: { id: 1, status: "blocked" } }), {
				status: 200,
				headers: { "content-type": "application/json" }
			})
		)

		const result = await patch<{ data: { id: number; status: string } }>(
			"/api/v1/admin/users/1/status",
			{ status: "blocked" }
		)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/users/1/status",
			expect.objectContaining({
				method: "PATCH",
				body: JSON.stringify({ status: "blocked" })
			})
		)
		expect(result).toEqual({ data: { id: 1, status: "blocked" } })
	})

	it("throws ApiError with the parsed body when the response is not ok", async () => {
		vi.mocked(fetch).mockResolvedValue(
			new Response(JSON.stringify({ message: "This action is unauthorized." }), {
				status: 403,
				headers: { "content-type": "application/json" }
			})
		)

		await expect(patch("/api/v1/admin/users/1/status", { status: "blocked" })).rejects.toMatchObject({
			status: 403,
			data: { message: "This action is unauthorized." }
		})
	})
})
