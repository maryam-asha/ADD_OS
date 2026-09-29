import type { RouteLocationNormalized } from "vue-router"
import { createPinia, setActivePinia } from "pinia"
import { beforeEach, describe, expect, it } from "vitest"
import { useAuthStore } from "@/stores/auth"
import { authGuard, safeRedirect } from "../authGuard"

const adminUser = { id: 1, name: "Maryam", email: "m@add.sy", roles: ["admin"] }

function route(fullPath: string, meta: RouteLocationNormalized["meta"], query: Record<string, string> = {}) {
	return { fullPath, path: fullPath.split("?")[0], meta, query } as unknown as RouteLocationNormalized
}

const protectedPage = (fullPath: string) => route(fullPath, { auth: true, roles: "all" })
const loginPage = (query: Record<string, string> = {}) => route("/login", { checkAuth: true }, query)

describe("authGuard", () => {
	beforeEach(() => {
		localStorage.clear()
		setActivePinia(createPinia())
	})

	it("sends a signed-out caller to /login carrying the page they asked for", () => {
		expect(authGuard(protectedPage("/members?page=3"))).toEqual({
			path: "/login",
			query: { redirect: "/members?page=3" }
		})
	})

	it("lets a signed-in caller through to a protected page", () => {
		useAuthStore().setLogged(adminUser)
		expect(authGuard(protectedPage("/members"))).toBeUndefined()
	})

	it("never shows /login to a signed-in caller — sends them on to the requested page", () => {
		useAuthStore().setLogged(adminUser)
		expect(authGuard(loginPage({ redirect: "/members?page=3" }))).toBe("/members?page=3")
	})

	it("sends a signed-in caller on /login with no redirect home", () => {
		useAuthStore().setLogged(adminUser)
		expect(authGuard(loginPage())).toBe("/")
	})

	it("shows /login to a signed-out caller", () => {
		expect(authGuard(loginPage({ redirect: "/members" }))).toBeUndefined()
	})
})

describe("safeRedirect", () => {
	it.each([
		["/members", "/members"],
		["/bookings/calendar?day=2026-09-28#x", "/bookings/calendar?day=2026-09-28#x"],
		// Dotless hosts and no scheme on purpose: `no-external-urls.spec.ts` scans
		// test files too. An absolute URL is refused by the same "must start with
		// a single /" rule as `members` below.
		["//elsewhere", "/"],
		["/\\elsewhere", "/"],
		["members", "/"],
		["/login", "/"],
		["/login?redirect=/members", "/"],
		[undefined, "/"],
		[null, "/"]
	])("%s → %s", (raw, expected) => {
		expect(safeRedirect(raw)).toBe(expected)
	})

	it("takes the first value of a repeated query key", () => {
		expect(safeRedirect(["/members", "/plans"])).toBe("/members")
	})
})
