import type { RouteLocationNormalized } from "vue-router"
import type { AdminUser } from "@/types/auth.d"
import { createPinia, setActivePinia } from "pinia"
import { beforeEach, describe, expect, it } from "vitest"
import { useAuthStore } from "@/stores/auth"
import { authGuard, MY_HR_PATH, safeRedirect } from "../authGuard"

const adminUser = { id: 1, name: "Maryam", email: "m@add.sy", roles: ["admin"], permissions: ["members.view", "branches.view"] }

function route(fullPath: string, meta: RouteLocationNormalized["meta"], query: Record<string, string> = {}) {
	return { fullPath, path: fullPath.split("?")[0], meta, query } as unknown as RouteLocationNormalized
}

const protectedPage = (fullPath: string) => route(fullPath, { auth: true, permission: "members.view" })
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

	describe("staff pages, by permission alone (live HR run 2026-10-21; one rule since 2026-10-27)", () => {
		const employee = { id: 9, employee_number: "ADD-0009", name: { ar: "يزن دبس", en: "Yazan Dibs" }, status: "probation" } as AdminUser["employee"]
		const staffPage = (fullPath: string, permission: string) => route(fullPath, { auth: true, permission })
		const openPage = (fullPath: string) => route(fullPath, { auth: true, allStaff: true })

		it("keeps a member who is also an employee signed in, and sends them to My HR from a staff page", () => {
			const store = useAuthStore()
			store.setLogged({ id: 8, name: "Lina", email: "lina@test.local", roles: ["member"], permissions: [], employee })
			expect(authGuard(staffPage("/members/individuals", "members.view"))).toEqual({ path: MY_HR_PATH })
			expect(store.isLogged).toBe(true)
		})

		it("sends an employee with no permission to My HR, even from a page open to every staff account", () => {
			useAuthStore().setLogged({ id: 9, name: "Yazan", email: "yazan@test.local", roles: [], permissions: [], employee })
			expect(authGuard(staffPage("/spatial/branches", "branches.view"))).toEqual({ path: MY_HR_PATH })
			expect(authGuard(openPage("/dashboard/overview"))).toEqual({ path: MY_HR_PATH })
		})

		it("signs out an account with no permission and no employee record, whatever its role", () => {
			for (const roles of [[], ["empty_role"], ["operations"]]) {
				const store = useAuthStore()
				store.setLogged({ id: 10, name: "Nobody", email: "nobody@test.local", roles, permissions: [] })
				expect(authGuard(openPage("/dashboard/overview"))).toEqual({ path: "/login" })
				expect(store.isLogged).toBe(false)
			}
		})

		it("lets a custom role into the page its permission opens and the pages open to all staff, and nothing else", () => {
			useAuthStore().setLogged({ id: 49, name: "Rana", email: "rana@test.local", roles: ["stack_holder"], permissions: ["amenities.view"] })
			expect(authGuard(staffPage("/spatial/amenities", "amenities.view"))).toBeUndefined()
			expect(authGuard(openPage("/dashboard/overview"))).toBeUndefined()
			expect(authGuard(staffPage("/spatial/buildings", "buildings.view"))).toEqual({ path: "/" })
		})

		it("turns operations away from a page whose permission it does not hold", () => {
			useAuthStore().setLogged({ id: 50, name: "Mazen", email: "mazen@test.local", roles: ["operations"], permissions: ["branches.view"] })
			expect(authGuard(staffPage("/spatial/branches", "branches.view"))).toBeUndefined()
			expect(authGuard(staffPage("/bookings/reception-desk", "reception.view"))).toEqual({ path: "/" })
		})

		it("turns admin away from a page whose permission /me does not list — the name opens nothing", () => {
			useAuthStore().setLogged({ id: 1, name: "Admin", email: "admin@test.local", roles: ["admin"], permissions: ["branches.view"] })
			expect(authGuard(staffPage("/members/individuals", "members.view"))).toEqual({ path: "/" })
		})

		it("refuses a staff page that names neither a permission nor allStaff — closed, not open", () => {
			useAuthStore().setLogged({ id: 1, name: "Admin", email: "admin@test.local", roles: ["admin"], permissions: ["branches.view"] })
			expect(authGuard(route("/somewhere", { auth: true }))).toEqual({ path: "/" })
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
