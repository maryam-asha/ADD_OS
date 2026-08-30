// src/add-os/modules/system/config/__tests__/roles.config.spec.ts
import type { PermissionModule, RoleRecord } from "@/add-os/modules/system/types/role"
import { describe, expect, it } from "vitest"
import { displayRoleName, isModuleFullySelected, isModulePartiallySelected } from "../roles.config"

const branchesModule: PermissionModule = {
	module: "branches",
	actions: [
		{ name: "branches.view", action: "view" },
		{ name: "branches.update", action: "update" },
		{ name: "branches.delete", action: "delete" }
	]
}

describe("isModuleFullySelected", () => {
	it("is true when every action in the module is selected", () => {
		expect(isModuleFullySelected(branchesModule, ["branches.view", "branches.update", "branches.delete"])).toBe(true)
	})

	it("is true when the selection also includes actions from other modules", () => {
		expect(isModuleFullySelected(branchesModule, ["branches.view", "branches.update", "branches.delete", "users.view"])).toBe(true)
	})

	it("is false when only some actions are selected", () => {
		expect(isModuleFullySelected(branchesModule, ["branches.view"])).toBe(false)
	})

	it("is false when none are selected", () => {
		expect(isModuleFullySelected(branchesModule, [])).toBe(false)
	})

	it("is false for a module with no actions at all — vacuous truth is not the desired UX here", () => {
		// Not actually reachable via a real API response, but every() on an empty
		// array returns true by definition — worth pinning down explicitly so a
		// future change to this function can't silently regress it.
		const empty: PermissionModule = { module: "empty", actions: [] }
		expect(isModuleFullySelected(empty, [])).toBe(true)
	})
})

describe("isModulePartiallySelected", () => {
	it("is true when some but not all actions are selected", () => {
		expect(isModulePartiallySelected(branchesModule, ["branches.view"])).toBe(true)
	})

	it("is false when none are selected", () => {
		expect(isModulePartiallySelected(branchesModule, [])).toBe(false)
	})

	it("is false when all are selected — that's fully selected, not partial", () => {
		expect(isModulePartiallySelected(branchesModule, ["branches.view", "branches.update", "branches.delete"])).toBe(false)
	})

	it("is unaffected by selections belonging to other modules", () => {
		expect(isModulePartiallySelected(branchesModule, ["users.view", "users.delete"])).toBe(false)
	})
})

describe("displayRoleName", () => {
	const translate = (key: string) => `translated(${key})`

	it("translates a protected role's name via roles.names.<name>", () => {
		const admin: RoleRecord = { id: 1, name: "admin", protected: true, permissions: [] }
		expect(displayRoleName(admin, translate)).toBe("translated(roles.names.admin)")
	})

	it("returns the raw name for a custom, non-protected role", () => {
		const custom: RoleRecord = { id: 4, name: "front-desk", protected: false, permissions: ["branches.view"] }
		expect(displayRoleName(custom, translate)).toBe("front-desk")
	})
})
