import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import { DEFAULT_LOCALE } from "@/add-os/lang/locales"
import { DEFAULT_CURRENCY } from "@/add-os/utils/format/currency"
import { del, downloadFile, get, patch, post, put } from "../api"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const { setLogoutMock, pushMock, currentRoute } = vi.hoisted(() => ({
	setLogoutMock: vi.fn(),
	pushMock: vi.fn(),
	// Mirrors vue-router's `router.currentRoute`. Writable so a test can put the
	// router where the bug actually happened — see "401 handling" below.
	currentRoute: { value: { name: "Branches" as string | undefined, fullPath: "/branches", meta: {} as { auth?: boolean } } }
}))

vi.mock("@/stores/auth", () => ({
	useAuthStore: () => ({
		setLogout: setLogoutMock
	})
}))

vi.mock("@/router", () => ({
	default: {
		push: pushMock,
		currentRoute
	}
}))

/** The router as it is on a protected page: navigation finished, session required. */
function onProtectedRoute() {
	currentRoute.value = { name: "Branches", fullPath: "/branches?page=2", meta: { auth: true } }
}

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
		onProtectedRoute()
	})

	const unauthenticated = () =>
		vi.mocked(fetch).mockResolvedValue(
			new Response(JSON.stringify({ message: "Unauthenticated." }), {
				status: 401,
				headers: { "content-type": "application/json" }
			})
		)

	it("logs out and redirects to /login on a 401, carrying the page to return to", async () => {
		unauthenticated()

		await expect(get("/api/v1/admin/branches")).rejects.toMatchObject({ status: 401 })

		expect(setLogoutMock).toHaveBeenCalledOnce()
		expect(pushMock).toHaveBeenCalledWith({ path: "/login", query: { redirect: "/branches?page=2" } })
	})

	/**
	 * `main.ts` awaits `initSession()` BEFORE mounting, so `getMe()` can 401 while
	 * the router's first navigation is still in flight — `currentRoute` is
	 * START_LOCATION, whose `name` is undefined.
	 *
	 * Redirecting from there started a second navigation that cancelled the first.
	 * Neither completed, the router stayed at START_LOCATION, and `<RouterView>`
	 * rendered nothing: a blank page, address bar unchanged, no Vue error. It hit
	 * `/forgot-password` and `/reset-password` and nothing else, because they are
	 * the only session-free routes that are not `/login` — pushing `/login` while
	 * on `/login` cancels nothing.
	 */
	it("does not navigate when the router has not finished its first navigation", async () => {
		currentRoute.value = { name: undefined, fullPath: "/", meta: {} }
		unauthenticated()

		await expect(get("/api/v1/admin/me")).rejects.toMatchObject({ status: 401 })

		expect(setLogoutMock, "stale session state must still be cleared").toHaveBeenCalledOnce()
		expect(pushMock, "a boot-time 401 must not race the first navigation").not.toHaveBeenCalled()
	})

	it("does not navigate away from a page that never required a session", async () => {
		currentRoute.value = { name: "ForgotPassword", fullPath: "/forgot-password", meta: {} }
		unauthenticated()

		await expect(get("/api/v1/admin/me")).rejects.toMatchObject({ status: 401 })

		expect(setLogoutMock).toHaveBeenCalledOnce()
		expect(pushMock, "a 401 is content for a public auth page, not a redirect").not.toHaveBeenCalled()
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

describe("downloadFile", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
		URL.createObjectURL = vi.fn(() => "report-object-url")
		URL.revokeObjectURL = vi.fn()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it("saves the body under the name the server gives, with the query and the language header", async () => {
		const clicked: string[] = []
		vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
			clicked.push(this.download)
		})
		vi.mocked(fetch).mockResolvedValue(
			new Response("code,hours", { status: 200, headers: { "content-type": "text/csv", "content-disposition": "attachment; filename=time-2026.csv" } })
		)
		setCurrentLocale("en")

		await downloadFile("/api/v1/hr/reports/time-by-cost-center", { from: "2026-10-01", format: "csv", cost_center_id: null }, "fallback.csv")

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/hr/reports/time-by-cost-center?from=2026-10-01&format=csv",
			expect.objectContaining({ method: "GET", credentials: "include", headers: expect.objectContaining({ lang: "en" }) })
		)
		expect(clicked).toEqual(["time-2026.csv"])
		expect(URL.revokeObjectURL).toHaveBeenCalledWith("report-object-url")
		setCurrentLocale(DEFAULT_LOCALE)
	})

	it("falls back to the given name and throws ApiError on a refusal", async () => {
		const clicked: string[] = []
		vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
			clicked.push(this.download)
		})
		vi.mocked(fetch).mockResolvedValueOnce(new Response("a,b", { status: 200 }))
		await downloadFile("/r", undefined, "fallback.csv")
		expect(clicked).toEqual(["fallback.csv"])

		vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ message: "The to field must be a date before or equal to 2027-10-02." }), { status: 422 }))
		await expect(downloadFile("/r", undefined, "fallback.csv")).rejects.toMatchObject({ status: 422, data: { message: "The to field must be a date before or equal to 2027-10-02." } })
	})
})
