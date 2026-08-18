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

const {
	changePassword,
	confirmPassword,
	getConfirmedPasswordStatus,
	updateProfileInformation,
	enableTwoFactorAuthentication,
	getTwoFactorQrCode,
	confirmTwoFactorAuthentication,
	getTwoFactorRecoveryCodes,
	regenerateTwoFactorRecoveryCodes,
	disableTwoFactorAuthentication,
	getTwoFactorStatus
} = await import("../account")

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("account service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("changePassword PUTs to /user/password", async () => {
		vi.mocked(fetch).mockResolvedValue(new Response("", { status: 200 }))

		const payload = { current_password: "old", password: "new-password", password_confirmation: "new-password" }
		await changePassword(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/user/password",
			expect.objectContaining({ method: "PUT", body: JSON.stringify(payload) })
		)
	})

	it("changePassword propagates a 423 (live-confirmed: stale password confirmation)", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Password confirmation required." }, 423))

		await expect(
			changePassword({ current_password: "old", password: "new-password", password_confirmation: "new-password" })
		).rejects.toMatchObject({ status: 423 })
	})

	it("changePassword propagates a 422 keyed on current_password for a wrong current password", async () => {
		vi.mocked(fetch).mockResolvedValue(
			jsonResponse({ message: "Invalid.", errors: { current_password: ["The provided password does not match your current password."] } }, 422)
		)

		await expect(
			changePassword({ current_password: "wrong", password: "new-password", password_confirmation: "new-password" })
		).rejects.toMatchObject({ status: 422, data: { errors: { current_password: expect.any(Array) } } })
	})

	it("confirmPassword POSTs the password to /user/confirm-password", async () => {
		vi.mocked(fetch).mockResolvedValue(new Response("", { status: 201 }))

		await confirmPassword("password")

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/user/confirm-password",
			expect.objectContaining({ method: "POST", body: JSON.stringify({ password: "password" }) })
		)
	})

	it("getConfirmedPasswordStatus GETs the status endpoint", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ confirmed: true }))

		const result = await getConfirmedPasswordStatus()

		expect(fetch).toHaveBeenCalledWith("http://api.test/user/confirmed-password-status", expect.objectContaining({ method: "GET" }))
		expect(result).toEqual({ confirmed: true })
	})

	it("updateProfileInformation PUTs name/email", async () => {
		vi.mocked(fetch).mockResolvedValue(new Response("", { status: 200 }))

		await updateProfileInformation({ name: "ADD Admin", email: "admin@add.local" })

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/user/profile-information",
			expect.objectContaining({ method: "PUT", body: JSON.stringify({ name: "ADD Admin", email: "admin@add.local" }) })
		)
	})

	it("enableTwoFactorAuthentication POSTs with no body", async () => {
		vi.mocked(fetch).mockResolvedValue(new Response("", { status: 200 }))

		await enableTwoFactorAuthentication()

		expect(fetch).toHaveBeenCalledWith("http://api.test/user/two-factor-authentication", expect.objectContaining({ method: "POST" }))
	})

	it("getTwoFactorQrCode returns the svg string when 2FA is set up", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ svg: "<svg>...</svg>" }))

		expect(await getTwoFactorQrCode()).toBe("<svg>...</svg>")
	})

	it("getTwoFactorQrCode returns null when 2FA was never enabled (live-observed: an empty array, not an object)", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse([]))

		expect(await getTwoFactorQrCode()).toBeNull()
	})

	it("confirmTwoFactorAuthentication POSTs the code and propagates a 422 keyed on `code`", async () => {
		vi.mocked(fetch).mockResolvedValue(
			jsonResponse({ message: "Invalid.", errors: { code: ["The provided two factor authentication code was invalid."] } }, 422)
		)

		await expect(confirmTwoFactorAuthentication("000000")).rejects.toMatchObject({ status: 422 })
		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/user/confirmed-two-factor-authentication",
			expect.objectContaining({ method: "POST", body: JSON.stringify({ code: "000000" }) })
		)
	})

	it("getTwoFactorRecoveryCodes returns the plain string array", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse(["code-1", "code-2"]))

		expect(await getTwoFactorRecoveryCodes()).toEqual(["code-1", "code-2"])
	})

	it("regenerateTwoFactorRecoveryCodes POSTs and resolves void (live-confirmed: empty response body)", async () => {
		vi.mocked(fetch).mockResolvedValue(new Response("", { status: 200 }))

		await expect(regenerateTwoFactorRecoveryCodes()).resolves.toBeUndefined()
		expect(fetch).toHaveBeenCalledWith("http://api.test/user/two-factor-recovery-codes", expect.objectContaining({ method: "POST" }))
	})

	it("disableTwoFactorAuthentication DELETEs the endpoint", async () => {
		vi.mocked(fetch).mockResolvedValue(new Response("", { status: 200 }))

		await disableTwoFactorAuthentication()

		expect(fetch).toHaveBeenCalledWith("http://api.test/user/two-factor-authentication", expect.objectContaining({ method: "DELETE" }))
	})

	it("getTwoFactorStatus reports setUp: false from the empty-array probe", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse([]))

		expect(await getTwoFactorStatus()).toEqual({ setUp: false })
	})

	it("getTwoFactorStatus reports setUp: true once a secret exists", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ svg: "<svg>...</svg>" }))

		expect(await getTwoFactorStatus()).toEqual({ setUp: true })
	})
})
