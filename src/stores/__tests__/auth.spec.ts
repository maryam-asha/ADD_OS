import type { AdminUser } from "@/types/auth.d"
import { createPinia, setActivePinia } from "pinia"
import { beforeEach, describe, expect, it } from "vitest"

import { useAuthStore } from "../auth"

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
})
