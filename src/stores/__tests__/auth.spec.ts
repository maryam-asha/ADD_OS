import type { AdminUser } from "@/types/auth.d"
import { createPinia, setActivePinia } from "pinia"
import { beforeEach, describe, expect, it } from "vitest"

import { mayUseDashboard, useAuthStore } from "../auth"

function sampleUser(overrides: Partial<AdminUser> = {}): AdminUser {
	return {
		id: 1,
		name: "Rana Khoury",
		email: "rana.khoury@add.local",
		roles: ["operations"],
		permissions: ["branches.view", "branches.update"],
		...overrides
	}
}

describe("auth store", () => {
	beforeEach(() => {
		setActivePinia(createPinia())
	})

	it("setLogged populates permissions from user.permissions", () => {
		const store = useAuthStore()

		store.setLogged(sampleUser({ permissions: ["branches.view", "branches.delete"] }))

		expect(store.permissions).toEqual(["branches.view", "branches.delete"])
	})

	it("hasPermission returns true for a granted permission and false for an ungranted one", () => {
		const store = useAuthStore()

		store.setLogged(sampleUser({ permissions: ["branches.view"] }))

		expect(store.hasPermission("branches.view")).toBe(true)
		expect(store.hasPermission("branches.delete")).toBe(false)
	})

	it("setLogged with user.permissions undefined leaves permissions as [] rather than throwing", () => {
		const store = useAuthStore()

		const { permissions: _omit, ...userWithoutPermissions } = sampleUser()

		expect(() => store.setLogged(userWithoutPermissions as AdminUser)).not.toThrow()
		expect(store.permissions).toEqual([])
		expect(store.hasPermission("branches.view")).toBe(false)
	})

	it("setLogout clears permissions", () => {
		const store = useAuthStore()

		store.setLogged(sampleUser({ permissions: ["branches.view"] }))
		expect(store.permissions).toEqual(["branches.view"])

		store.setLogout()

		expect(store.permissions).toEqual([])
	})

	it("identifies provider accounts correctly", () => {
		const store = useAuthStore()

		store.setLogged(sampleUser({ roles: ["provider"] }))
		expect(store.isProvider).toBe(true)
		expect(store.isAdmin).toBe(false)
		expect(store.mayUseDashboard).toBe(true)
		expect(store.userRole).toBe("provider")
		expect(store.isRoleGranted(["provider"])).toBe(true)
		expect(store.isRoleGranted(["admin"])).toBe(false)
	})

	it("identifies member-only accounts correctly", () => {
		const store = useAuthStore()

		store.setLogged(sampleUser({ roles: ["member"] }))
		expect(store.isProvider).toBe(false)
		expect(store.isAdmin).toBe(false)
		expect(store.mayUseDashboard).toBe(false)
		expect(store.userRole).toBe("member")
	})

	it("identifies admin and operations accounts correctly", () => {
		const store = useAuthStore()

		store.setLogged(sampleUser({ roles: ["admin"] }))
		expect(store.isProvider).toBe(false)
		expect(store.isAdmin).toBe(true)
		expect(store.mayUseDashboard).toBe(true)
		expect(store.userRole).toBe("admin")
		expect(store.isRoleGranted(["admin"])).toBe(true)
		expect(store.isRoleGranted(["provider"])).toBe(false)

		store.setLogged(sampleUser({ roles: ["operations"] }))
		expect(store.isProvider).toBe(false)
		expect(store.isAdmin).toBe(true)
		expect(store.userRole).toBe("operations")
	})
})

/**
 * Found by the live HR run of 2026-10-21: sign-in turned away a member who is
 * an employee; an account with no role passed the admin gate and landed on
 * pages the server refused; and a custom role (hr_manager) was shown every
 * admin page, each a 403.
 */
describe("who reaches what", () => {
	const employee = { id: 8, employee_number: "ADD-0008", name: { ar: "لينا عبيد", en: "Lina Obeid" }, status: "probation" } as AdminUser["employee"]
	const ADMIN_GATE = ["admin", "operations"]

	beforeEach(() => {
		setActivePinia(createPinia())
	})

	describe("mayUseDashboard", () => {
		it.each([
			["admin", { roles: ["admin"] }, true],
			["a custom role", { roles: ["hr_manager"] }, true],
			["a provider", { roles: ["provider"] }, true],
			["a member who is an employee", { roles: ["member"], employee }, true],
			["an employee with no role", { roles: [], employee }, true],
			["a member only", { roles: ["member"], employee: null }, false],
			["no role and no employee record", { roles: [], employee: null }, false]
		])("%s → %s", (_label, account, expected) => {
			expect(mayUseDashboard(account as AdminUser)).toBe(expected)
			const store = useAuthStore()
			store.setLogged(sampleUser(account as Partial<AdminUser>))
			expect(store.mayUseDashboard).toBe(expected)
		})

		it("does not refuse before /me has answered — the user is not loaded after a reload", () => {
			const store = useAuthStore()
			store.logged = true
			store.role = null
			expect(store.mayUseDashboard).toBe(true)
		})
	})

	describe("the admin gate", () => {
		it.each([
			["admin", ["admin"], true],
			["operations", ["operations"], true],
			["a custom role", ["hr_manager"], true],
			["no role", [], false],
			["member + employee", ["member"], false],
			["provider", ["provider"], false]
		])("%s → %s", (_label, roles, expected) => {
			const store = useAuthStore()
			store.setLogged(sampleUser({ roles, employee }))
			expect(store.isRoleGranted(ADMIN_GATE)).toBe(expected)
		})

		it("reads the role kept across a reload while the user is not loaded", () => {
			const store = useAuthStore()
			store.logged = true
			store.role = "hr_manager"
			expect(store.isRoleGranted(ADMIN_GATE)).toBe(true)
			expect(store.isStaff).toBe(false)
			expect(store.hasDashboardRole).toBe(true)
		})
	})

	describe("mayOpenAdminPage", () => {
		it("opens every untagged page to admin and operations, and a tagged one only with its permission", () => {
			const store = useAuthStore()
			store.setLogged(sampleUser({ roles: ["operations"], permissions: ["branches.view"] }))

			expect(store.mayOpenAdminPage(undefined)).toBe(true)
			expect(store.mayOpenAdminPage("any")).toBe(true)
			expect(store.mayOpenAdminPage(["branches.view"])).toBe(true)
			expect(store.mayOpenAdminPage(["invoices.view"])).toBe(false)
		})

		it("opens to a custom role only what is tagged \"any\" or with a permission it holds", () => {
			const store = useAuthStore()
			store.setLogged(sampleUser({ roles: ["hr_manager"], permissions: ["hr.employees.view", "invoices.view"] }))

			expect(store.mayOpenAdminPage(undefined)).toBe(false)
			expect(store.mayOpenAdminPage("any")).toBe(true)
			expect(store.mayOpenAdminPage(["invoices.view"])).toBe(true)
			expect(store.mayOpenAdminPage(["branches.view"])).toBe(false)
		})

		it("opens nothing behind the admin gate to an account with no dashboard role", () => {
			const store = useAuthStore()
			store.setLogged(sampleUser({ roles: ["member"], permissions: [], employee }))

			expect(store.mayOpenAdminPage("any")).toBe(false)
			expect(store.mayOpenAdminPage(undefined)).toBe(false)
		})
	})
})
