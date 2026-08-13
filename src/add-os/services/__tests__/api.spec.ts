import { beforeEach, describe, expect, it, vi } from "vitest"

import { get, patch } from "../api"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const { setLogoutMock, pushMock } = vi.hoisted(() => ({
	setLogoutMock: vi.fn(),
	pushMock: vi.fn()
}))

vi.mock("@/stores/auth", () => ({
	useAuthStore: () => ({
		setLogout: setLogoutMock
	})
}))

vi.mock("@/router", () => ({
	default: {
		push: pushMock
	}
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

describe("401 handling", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
		setLogoutMock.mockClear()
		pushMock.mockClear()
	})

	it("logs out and redirects to /login on a 401, before throwing", async () => {
		vi.mocked(fetch).mockResolvedValue(
			new Response(JSON.stringify({ message: "Unauthenticated." }), {
				status: 401,
				headers: { "content-type": "application/json" }
			})
		)

		await expect(get("/api/v1/admin/branches")).rejects.toMatchObject({ status: 401 })

		expect(setLogoutMock).toHaveBeenCalledOnce()
		expect(pushMock).toHaveBeenCalledWith("/login")
	})

	it("does not log out on a non-401 error", async () => {
		vi.mocked(fetch).mockResolvedValue(
			new Response(JSON.stringify({ message: "Forbidden." }), {
				status: 403,
				headers: { "content-type": "application/json" }
			})
		)

		await expect(get("/api/v1/admin/branches")).rejects.toMatchObject({ status: 403 })

		expect(setLogoutMock).not.toHaveBeenCalled()
		expect(pushMock).not.toHaveBeenCalled()
	})
})
