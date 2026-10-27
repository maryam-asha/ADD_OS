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

		store.setLogged(sampleUser({ roles: ["provider"], permissions: [] }))
		expect(store.isProvider).toBe(true)
		expect(store.isStaff).toBe(false)
		expect(store.mayUseDashboard).toBe(true)
		expect(store.userRole).toBe("provider")
		expect(store.isRoleGranted(["provider"])).toBe(true)
		expect(store.isRoleGranted(["admin"])).toBe(false)
	})

	it("identifies member-only accounts correctly", () => {
		const store = useAuthStore()

		store.setLogged(sampleUser({ roles: ["member"], permissions: [] }))
		expect(store.isProvider).toBe(false)
		expect(store.isStaff).toBe(false)
		expect(store.mayUseDashboard).toBe(false)
		expect(store.userRole).toBe("member")
	})

	it("counts admin and operations as staff by their permissions, not their names", () => {
		const store = useAuthStore()

		store.setLogged(sampleUser({ roles: ["admin"] }))
		expect(store.isProvider).toBe(false)
		expect(store.isStaff).toBe(true)
		expect(store.mayUseDashboard).toBe(true)
		expect(store.userRole).toBe("admin")
		expect(store.isRoleGranted(["admin"])).toBe(true)
		expect(store.isRoleGranted(["provider"])).toBe(false)

		store.setLogged(sampleUser({ roles: ["operations"], permissions: [] }))
		expect(store.userRole).toBe("operations")
		expect(store.isStaff).toBe(false)
		expect(store.mayUseDashboard).toBe(false)
	})
})

/**
 * Found by the live HR run of 2026-10-21: sign-in turned away a member who is
 * an employee; an account with no role passed the admin gate and landed on
 * pages the server refused; and a custom role (hr_manager) was shown every
 * admin page, each a 403. Since 2026-10-27 a staff account is one holding a
 * permission — the role's name decides nothing.
 */
describe("who reaches what", () => {
	const employee = { id: 8, employee_number: "ADD-0008", name: { ar: "لينا عبيد", en: "Lina Obeid" }, status: "probation" } as AdminUser["employee"]

	beforeEach(() => {
		setActivePinia(createPinia())
	})

	describe("mayUseDashboard", () => {
		it.each([
			["admin", { roles: ["admin"], permissions: ["branches.view"] }, true],
			["a custom role holding a permission", { roles: ["stack_holder"], permissions: ["amenities.view"] }, true],
			["a custom role granted nothing", { roles: ["empty_role"], permissions: [] }, false],
			["operations granted nothing", { roles: ["operations"], permissions: [] }, false],
			["a provider", { roles: ["provider"], permissions: [] }, true],
			["a member who is an employee", { roles: ["member"], permissions: [], employee }, true],
			["an employee with no role", { roles: [], permissions: [], employee }, true],
			["a member only", { roles: ["member"], permissions: [], employee: null }, false],
			["no role and no employee record", { roles: [], permissions: [], employee: null }, false]
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

	describe("isStaff", () => {
		it.each([
			["admin holding permissions", ["admin"], ["branches.view"], true],
			["operations holding permissions", ["operations"], ["reception.view"], true],
			["a custom role holding one", ["stack_holder"], ["amenities.view"], true],
			["admin holding none", ["admin"], [], false],
			["a member", ["member"], [], false],
			["a provider, even holding a permission", ["provider"], ["branches.view"], false]
		])("%s → %s", (_label, roles, permissions, expected) => {
			const store = useAuthStore()
			store.setLogged(sampleUser({ roles, permissions, employee }))
			expect(store.isStaff).toBe(expected)
		})

		it("reads the permissions kept across a reload while the user is not loaded", () => {
			const store = useAuthStore()
			store.logged = true
			store.role = "hr_manager"
			store.permissions = ["hr.employees.view"]
			expect(store.isStaff).toBe(true)
		})
	})
})
