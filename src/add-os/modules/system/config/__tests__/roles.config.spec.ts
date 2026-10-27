// src/add-os/modules/system/config/__tests__/roles.config.spec.ts
import type { PermissionModule, RoleRecord } from "@/add-os/modules/system/types/role"
import { describe, expect, it } from "vitest"
import { KNOWN_PERMISSIONS } from "../known-permissions"
import {
	applyViewRule,
	displayActionName,
	displayModuleName,
	displayRoleName,
	isModuleFullySelected,
	isModulePartiallySelected,
	viewPermissionOf
} from "../roles.config"

describe("the view rule — no action without its view", () => {
	const grantable = new Set(["spaces.view", "spaces.create", "spaces.update", "hr.payroll.view", "hr.payroll.approve", "hr.roster.manage", "renewals.manage", "dashboard.finance"])

	it("finds an action's view by its last segment, also under a module of several resources", () => {
		expect(viewPermissionOf("spaces.create", grantable)).toBe("spaces.view")
		expect(viewPermissionOf("hr.payroll.approve", grantable)).toBe("hr.payroll.view")
	})

	it("finds none for a view, nor for an action with no view to grant beside it", () => {
		expect(viewPermissionOf("spaces.view", grantable)).toBeNull()
		expect(viewPermissionOf("renewals.manage", grantable)).toBeNull()
		expect(viewPermissionOf("dashboard.finance", grantable)).toBeNull()
		expect(viewPermissionOf("hr.roster.manage", grantable)).toBeNull()
	})

	it("adds the view of an action selected", () => {
		expect(applyViewRule([], ["spaces.update"], grantable).sort()).toEqual(["spaces.update", "spaces.view"])
		expect(applyViewRule(["spaces.view"], ["spaces.view", "hr.payroll.approve"], grantable).sort()).toEqual(["hr.payroll.approve", "hr.payroll.view", "spaces.view"])
	})

	it("takes away the actions of a view taken away, and nothing else", () => {
		const before = ["spaces.view", "spaces.create", "hr.payroll.view", "hr.payroll.approve"]
		expect(applyViewRule(before, ["spaces.create", "hr.payroll.view", "hr.payroll.approve"], grantable).sort()).toEqual(["hr.payroll.approve", "hr.payroll.view"])
	})

	it("leaves an action with no view alone", () => {
		expect(applyViewRule([], ["renewals.manage"], grantable)).toEqual(["renewals.manage"])
	})
})

describe("the view rule over every permission ADD Core can return (2026-10-27)", () => {
	const known = new Set(KNOWN_PERMISSIONS)

	it.each([
		["reception.check_in", "reception.view"],
		["reception.book", "reception.view"],
		["reception.approve", "reception.view"],
		["reception.settle_payment", "reception.view"],
		["reception.record_consumption", "reception.view"],
		["companies.update_status", "companies.view"],
		["companies.manage_members", "companies.view"],
		["kiosks.pair", "kiosks.view"],
		["cash-register.manage", "cash-register.view"],
		["events.manage_attendees", "events.view"],
		["wallet-top-ups.create", "wallet-top-ups.view"],
		["item-sales.create", "item-sales.view"],
		["exchange-rates.create", "exchange-rates.view"],
		["app-content.update", "app-content.view"],
		["site-inquiries.update", "site-inquiries.view"],
		["service-requests.update", "service-requests.view"],
		["coupons.delete", "coupons.view"],
		["memberships.create", "memberships.view"],
		["users.assign_role", "users.view"],
		["providers.transfer_company", "providers.view"],
		["invoices.void_payment", "invoices.view"],
		["hr.employees.view_sensitive", "hr.employees.view"],
		["inventory.stock.adjust", "inventory.stock.view"]
	])("%s brings %s with it, and taking the view away takes it back", (action, view) => {
		expect(viewPermissionOf(action, known)).toBe(view)
		expect(applyViewRule([], [action], known).sort()).toEqual([action, view].sort())
		expect(applyViewRule([action, view], [action], known)).toEqual([])
	})

	it.each([
		"plan-purchases.create",
		"notifications.broadcast",
		"renewals.manage",
		"dashboard.finance",
		"hr.roster.manage",
		"hr.lifecycle.manage"
	])("%s has no view beside it, so it stays alone", action => {
		expect(viewPermissionOf(action, known)).toBeNull()
		expect(applyViewRule([], [action], known)).toEqual([action])
	})

	it("repairs a whole saved selection without adding a view the API never offers", () => {
		const repaired = applyViewRule([], ["plan-purchases.create", "notifications.broadcast", "kiosks.pair"], known)
		expect(repaired.sort()).toEqual(["kiosks.pair", "kiosks.view", "notifications.broadcast", "plan-purchases.create"])
	})
})

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

describe("displayModuleName", () => {
	const translations: Record<string, string> = {
		"roles.modules.branches": "الفروع",
		"roles.modules.users": "المستخدمون"
	}
	const translate = (key: string) => translations[key] ?? key
	const hasTranslation = (key: string) => key in translations

	it("translates known module names", () => {
		expect(displayModuleName("branches", translate, hasTranslation)).toBe("الفروع")
		expect(displayModuleName("users", translate, hasTranslation)).toBe("المستخدمون")
	})

	it("falls back to the raw module identifier when unmapped", () => {
		expect(displayModuleName("unknown-module", translate, hasTranslation)).toBe("unknown-module")
	})
})

describe("displayActionName", () => {
	const translations: Record<string, string> = {
		"roles.actions.view": "عرض",
		"roles.actions.create": "إضافة"
	}
	const translate = (key: string) => translations[key] ?? key
	const hasTranslation = (key: string) => key in translations

	it("translates known action words", () => {
		expect(displayActionName("view", translate, hasTranslation)).toBe("عرض")
		expect(displayActionName("create", translate, hasTranslation)).toBe("إضافة")
	})

	it("falls back to the raw action word when unmapped", () => {
		expect(displayActionName("custom_action", translate, hasTranslation)).toBe("custom_action")
	})
})
