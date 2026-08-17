import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import { DEFAULT_LOCALE } from "@/add-os/lang/locales"
import { DEFAULT_CURRENCY } from "@/add-os/utils/format/currency"
import { del, get, patch, post, put } from "../api"

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

describe("default headers (lang/currency)", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
		vi.mocked(fetch).mockImplementation(
			async () =>
				new Response(JSON.stringify({ data: [] }), { status: 200, headers: { "content-type": "application/json" } })
		)
	})

	afterEach(() => {
		setCurrentLocale(DEFAULT_LOCALE)
	})

	it.each([
		["GET", () => get("/api/v1/admin/widgets")],
		["POST", () => post("/api/v1/admin/widgets", {})],
		["PUT", () => put("/api/v1/admin/widgets/1", {})],
		["PATCH", () => patch("/api/v1/admin/widgets/1", {})],
		["DELETE", () => del("/api/v1/admin/widgets/1")]
	] as const)("sends lang and currency on %s", async (_method: string, run: () => Promise<unknown>) => {
		await run()

		expect(fetch).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				headers: expect.objectContaining({ lang: DEFAULT_LOCALE, currency: DEFAULT_CURRENCY })
			})
		)
	})

	it("reads currentLocale at request time, so a language switch applies to the next request", async () => {
		await get("/api/v1/admin/widgets")
		expect(fetch).toHaveBeenLastCalledWith(
			expect.any(String),
			expect.objectContaining({ headers: expect.objectContaining({ lang: "ar" }) })
		)

		setCurrentLocale("en")
		await get("/api/v1/admin/widgets")
		expect(fetch).toHaveBeenLastCalledWith(
			expect.any(String),
			expect.objectContaining({ headers: expect.objectContaining({ lang: "en" }) })
		)
	})

	it("lets caller-supplied headers override the lang/currency default", async () => {
		await get("/api/v1/admin/widgets", undefined, { currency: "USD" })

		expect(fetch).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				headers: expect.objectContaining({ currency: "USD", lang: DEFAULT_LOCALE })
			})
		)
	})
})
