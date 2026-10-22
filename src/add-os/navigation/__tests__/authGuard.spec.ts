import type { RouteLocationNormalized } from "vue-router"
import type { AdminUser, OpenedBy } from "@/types/auth.d"
import { createPinia, setActivePinia } from "pinia"
import { beforeEach, describe, expect, it } from "vitest"
import { useAuthStore } from "@/stores/auth"
import { authGuard, MY_HR_PATH, safeRedirect } from "../authGuard"

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

	it("redirects a provider attempting to access an admin route to /provider/summary", () => {
		useAuthStore().setLogged({ id: 2, name: "Provider Alpha", email: "alpha@test.local", roles: ["provider"] })
		expect(authGuard(protectedPage("/spatial/branches"))).toEqual({
			path: "/provider/summary"
		})
	})

	it("redirects an admin attempting to access a provider route to /", () => {
		useAuthStore().setLogged(adminUser)
		const providerPage = route("/provider/summary", { auth: true, roles: ["provider"] })
		expect(authGuard(providerPage)).toEqual({
			path: "/"
		})
	})

	it("allows a provider to access a provider route", () => {
		useAuthStore().setLogged({ id: 2, name: "Provider Alpha", email: "alpha@test.local", roles: ["provider"] })
		const providerPage = route("/provider/summary", { auth: true, roles: ["provider"] })
		expect(authGuard(providerPage)).toBeUndefined()
	})

	it("logs out and redirects a member-only user to /login", () => {
		const store = useAuthStore()
		store.setLogged({ id: 3, name: "Member User", email: "member@test.local", roles: ["member"] })
		expect(authGuard(protectedPage("/spatial/branches"))).toEqual({
			path: "/login"
		})
		expect(store.isLogged).toBe(false)
	})

	describe("behind the admin gate (live HR run, 2026-10-21)", () => {
		const employee = { id: 9, employee_number: "ADD-0009", name: { ar: "يزن دبس", en: "Yazan Dibs" }, status: "probation" } as AdminUser["employee"]
		const adminPage = (fullPath: string, openedBy?: OpenedBy) => route(fullPath, { auth: true, roles: ["admin", "operations"], openedBy })

		it("keeps a member who is also an employee signed in, and sends them to My HR from an admin page", () => {
			const store = useAuthStore()
			store.setLogged({ id: 8, name: "Lina", email: "lina@test.local", roles: ["member"], employee })
			expect(authGuard(adminPage("/members/individuals"))).toEqual({ path: MY_HR_PATH })
			expect(store.isLogged).toBe(true)
		})

		it("sends an employee with no role to My HR, not onto admin pages", () => {
			useAuthStore().setLogged({ id: 9, name: "Yazan", email: "yazan@test.local", roles: [], employee })
			expect(authGuard(adminPage("/spatial/branches", ["branches.view"]))).toEqual({ path: MY_HR_PATH })
			expect(authGuard(adminPage("/dashboard/overview", "any"))).toEqual({ path: MY_HR_PATH })
		})

		it("signs out an account with no role and no employee record", () => {
			const store = useAuthStore()
			store.setLogged({ id: 10, name: "Nobody", email: "nobody@test.local", roles: [] })
			expect(authGuard(adminPage("/members/individuals"))).toEqual({ path: "/login" })
			expect(store.isLogged).toBe(false)
		})

		it("turns a custom role away from an admin page the server keeps for admin and operations", () => {
			useAuthStore().setLogged({ id: 48, name: "Dana", email: "dana@test.local", roles: ["hr_manager"], permissions: ["hr.employees.view"] })
			expect(authGuard(adminPage("/members/individuals"))).toEqual({ path: "/" })
			expect(authGuard(adminPage("/payments/invoices", ["invoices.view"]))).toEqual({ path: "/" })
		})

		it("lets a custom role into an admin page its permission opens, and the dashboard home", () => {
			useAuthStore().setLogged({ id: 49, name: "Rana", email: "rana@test.local", roles: ["finance_clerk"], permissions: ["invoices.view"] })
			expect(authGuard(adminPage("/payments/invoices", ["invoices.view"]))).toBeUndefined()
			expect(authGuard(adminPage("/dashboard/overview", "any"))).toBeUndefined()
		})

		it("turns operations away from a page whose permission the server asks of it too", () => {
			useAuthStore().setLogged({ id: 50, name: "Mazen", email: "mazen@test.local", roles: ["operations"], permissions: ["branches.view"] })
			expect(authGuard(adminPage("/spatial/branches", ["branches.view"]))).toBeUndefined()
			expect(authGuard(adminPage("/members/individuals"))).toBeUndefined()
			expect(authGuard(adminPage("/providers/list", ["providers.view"]))).toEqual({ path: "/" })
		})
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
