import { createPinia, setActivePinia } from "pinia"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ApiError } from "@/add-os/services/api"
import { useAuthStore } from "@/stores/auth"

const { getMeMock } = vi.hoisted(() => ({ getMeMock: vi.fn() }))

vi.mock("@/add-os/services/auth", () => ({ getMe: getMeMock }))
vi.mock("@/add-os/config/env", () => ({ hasApiUrl: () => true }))

/**
 * Restoring the session at boot: only ADD Core saying the session is gone
 * (401, or 419 for an expired CSRF session) signs the browser out. A request
 * that never got an answer — the API restarting, a slow local server, a
 * dropped connection — says nothing about the session, and used to sign the
 * caller out and bounce them to /login on the next page.
 */
describe("initSession", () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		getMeMock.mockReset()
	})

	function signedIn() {
		const auth = useAuthStore()
		auth.setLogged({ id: 1, name: "A", email: "a@x.test", roles: ["admin"], permissions: ["inventory.assets.view"] } as never)
		return auth
	}

	it("keeps the session when the API could not be reached", async () => {
		const auth = signedIn()
		getMeMock.mockRejectedValue(new TypeError("Failed to fetch"))

		await auth.initSession()

		expect(auth.isLogged).toBe(true)
	})

	it("keeps the session when the API failed on its side", async () => {
		const auth = signedIn()
		getMeMock.mockRejectedValue(new ApiError(503, "{}"))

		await auth.initSession()

		expect(auth.isLogged).toBe(true)
	})

	it("signs out when ADD Core says the session is gone, or the account is suspended", async () => {
		// 403: EnsureAuthenticatedUserIsActive refuses a suspended account on every request, `me` included.
		for (const status of [401, 403, 419]) {
			const auth = signedIn()
			getMeMock.mockRejectedValue(new ApiError(status, "{}"))

			await auth.initSession()

			expect(auth.isLogged, `status ${status}`).toBe(false)
		}
	})
})
