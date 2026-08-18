import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

vi.mock("@/router", () => ({
	default: { push: vi.fn() }
}))

vi.mock("@/stores/auth", () => ({
	useAuthStore: () => ({ setLogout: vi.fn() })
}))

const { getCsrfCookie, login, twoFactorChallenge, getMe, logout, requestPasswordReset, resetPassword } = await import("../auth")

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("auth service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("getCsrfCookie GETs the raw Sanctum endpoint with credentials, bypassing api.ts", async () => {
		vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))

		await getCsrfCookie()

		expect(fetch).toHaveBeenCalledWith("http://api.test/sanctum/csrf-cookie", { method: "GET", credentials: "include" })
	})

	it("getCsrfCookie throws a plain Error (not ApiError) on failure", async () => {
		vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 500 }))

		await expect(getCsrfCookie()).rejects.toThrow("Failed to fetch CSRF cookie: 500")
	})

	it("login POSTs email/password and resolves the two_factor flag, with no side-effect logging", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ two_factor: false }))

		const result = await login("admin@add.local", "password")

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/login",
			expect.objectContaining({ method: "POST", body: JSON.stringify({ email: "admin@add.local", password: "password" }) })
		)
		expect(result).toEqual({ two_factor: false })
	})

	it("twoFactorChallenge POSTs either a code or a recovery_code", async () => {
		vi.mocked(fetch).mockResolvedValue(new Response("", { status: 200 }))

		await twoFactorChallenge({ code: "123456" })

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/two-factor-challenge",
			expect.objectContaining({ method: "POST", body: JSON.stringify({ code: "123456" }) })
		)
	})

	it("getMe GETs /api/v1/admin/me and unwraps the user envelope", async () => {
		const user = { id: 1, name: "ADD Admin", email: "admin@add.local", roles: ["admin"] }
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ user }))

		const result = await getMe()

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/me", expect.objectContaining({ method: "GET" }))
		expect(result).toEqual(user)
	})

	it("logout POSTs to /logout", async () => {
		vi.mocked(fetch).mockResolvedValue(new Response("", { status: 200 }))

		await logout()

		expect(fetch).toHaveBeenCalledWith("http://api.test/logout", expect.objectContaining({ method: "POST" }))
	})

	it("requestPasswordReset POSTs the email to /forgot-password", async () => {
		vi.mocked(fetch).mockResolvedValue(new Response("", { status: 200 }))

		await requestPasswordReset("admin@add.local")

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/forgot-password",
			expect.objectContaining({ method: "POST", body: JSON.stringify({ email: "admin@add.local" }) })
		)
	})

	it("requestPasswordReset propagates a 409 (already-logged-in, live-observed) as an ApiError", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "You are already logged in." }, 409))

		await expect(requestPasswordReset("admin@add.local")).rejects.toMatchObject({ status: 409 })
	})

	it("resetPassword POSTs token/email/password to /reset-password", async () => {
		vi.mocked(fetch).mockResolvedValue(new Response("", { status: 200 }))

		const payload = { token: "abc123", email: "admin@add.local", password: "new-password", password_confirmation: "new-password" }
		await resetPassword(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/reset-password",
			expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
		)
	})

	it("resetPassword propagates a 422 keyed on `email` for a bad token (live-observed shape)", async () => {
		vi.mocked(fetch).mockResolvedValue(
			jsonResponse({ message: "The given data was invalid.", errors: { email: ["This password reset token is invalid."] } }, 422)
		)

		await expect(
			resetPassword({ token: "bogus", email: "admin@add.local", password: "new-password", password_confirmation: "new-password" })
		).rejects.toMatchObject({ status: 422, data: { errors: { email: ["This password reset token is invalid."] } } })
	})
})
