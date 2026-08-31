import type { RoleRecord } from "@/add-os/modules/system/types/role"
import type { User } from "@/add-os/modules/system/types/user"
import { readFileSync } from "node:fs"
import path from "node:path"
import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import UsersPage from "../UsersPage.vue"

const { listRoleRecordsMock, listUsersMock, messageMock } = vi.hoisted(() => ({
	listRoleRecordsMock: vi.fn(),
	listUsersMock: vi.fn(),
	messageMock: { success: vi.fn(), error: vi.fn() }
}))

vi.mock("@/add-os/services/roles", () => ({
	listRoleRecords: listRoleRecordsMock
}))

vi.mock("@/add-os/services/users", () => ({
	listUsers: listUsersMock,
	createUser: vi.fn(),
	updateUserProfile: vi.fn(),
	updateUserStatus: vi.fn(),
	assignRole: vi.fn()
}))

// Same pitfall every other page spec in this codebase documents: the page
// calls useMessage() directly, which needs a provider it has no reason to
// mount.
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => messageMock }
})

/**
 * ADD OS — guard for UsersPage.vue's inline `<n-data-table>`.
 *
 * Unlike the other four resource-list pages (Branches/Buildings/Spaces/
 * Resources), Users doesn't go through the shared `ResourceTable.vue` — it
 * hand-rolls its own `<n-data-table>` (see
 * docs/superpowers/specs/2026-08-16-resource-list-visual-refresh-design.md).
 * The ledger-style uppercase header treatment from `_resource-table.scss`
 * only reaches this table via the `add-ledger-table` class, and nothing else
 * pins it in place.
 *
 * A full component mount isn't worth a new mocking harness for this single
 * assertion — the page pulls in services, i18n and the message provider — so
 * this is a lightweight source-level guard instead, following the same
 * `readFileSync`-and-scan approach as the `no-*` guard specs under
 * `src/add-os/__tests__/`.
 */

const FILE = path.resolve(__dirname, "..", "UsersPage.vue")

describe("usersPage inline table", () => {
	it("applies the add-ledger-table class to its own n-data-table", () => {
		const source = readFileSync(FILE, "utf8")
		expect(source).toContain("add-ledger-table")
	})
})

/**
 * Guards the fix for the drift risk a prior version of this file accepted on
 * purpose: a hardcoded `["member", "operations", "admin"]` role list (plus a
 * second hardcoded subset for the create-user drawer) instead of the same
 * roles endpoint `RolesPage.vue` already calls. Source-scan, for the same
 * reason as the guard above — no mount harness for one assertion.
 */
describe("usersPage role options", () => {
	it("sources role dropdowns from listRoleRecords(), not a hardcoded literal array", () => {
		const source = readFileSync(FILE, "utf8")
		expect(source).toContain('import { listRoleRecords } from "@/add-os/services/roles"')
		expect(source).not.toMatch(/\[\s*"member",\s*"operations",\s*"admin"\s*\]/)
	})
})

/**
 * Final-review fix: `listRoles()` used to be the only thing this page called,
 * and it could only ever return the three seeded role names, so every
 * `t(\`roles.names.${role}\`)` call site in this file was safe. Task F1
 * changed `listRoles()` to derive from the actual current role set, and F3
 * added real custom roles via `RolesPage.vue` — so the first custom role an
 * admin creates made the role column, role filter dropdown, and create-user
 * role dropdown all render the literal string `roles.names.<custom-name>`
 * instead of the role's name. This is a real mount, not a source-scan guard:
 * the bug is in rendered output, not in what the source text contains.
 */
describe("usersPage custom role display (final-review fix)", () => {
	const memberRole: RoleRecord = { id: 1, name: "member", protected: true, permissions: [] }
	const operationsRole: RoleRecord = { id: 2, name: "operations", protected: true, permissions: [] }
	const adminRole: RoleRecord = { id: 3, name: "admin", protected: true, permissions: ["branches.view"] }
	const customRole: RoleRecord = { id: 4, name: "front-desk", protected: false, permissions: ["branches.view"] }

	function makeUser(overrides: Partial<User>): User {
		return {
			id: 10,
			name: "Rana",
			phone: "0911111111",
			email: "rana@example.com",
			preferred_language: "en",
			preferred_currency: "USD",
			status: "active",
			roles: ["front-desk"],
			...overrides
		}
	}

	const i18n = createI18n({
		legacy: false,
		locale: "en",
		messages: {
			en: {
				nav: { pages: { users: "Users" } },
				users: {
					description: "Operations and admin accounts on the dashboard. Members register from the app and never appear here.",
					searchPlaceholder: "Search by name, phone or email",
					roleFilterPlaceholder: "Filter by role",
					columns: { name: "Name", phone: "Phone", email: "Email", role: "Role", status: "Status", actions: "Actions" },
					status: { active: "Active", deactivated: "Deactivated", blocked: "Blocked" },
					create: { button: "New user", title: "New user", success: "User created." },
					edit: { title: "Edit user", button: "Edit", success: "Profile updated." },
					changeStatus: {
						button: "Change status",
						title: "Change status",
						warning: "Deactivating or blocking signs this user out of every device immediately.",
						reasonLabel: "Reason (optional)",
						reasonPlaceholder: "Why is the status changing?",
						success: "Status updated."
					},
					changeRole: { button: "Change role", title: "Change role", success: "Role updated." },
					form: {
						name: "Full name",
						phone: "Phone",
						phonePlaceholder: "09XXXXXXXX",
						email: "Email",
						password: "Password",
						passwordConfirmation: "Confirm password",
						role: "Role",
						rolePlaceholder: "Select a role",
						submit: "Save",
						cancel: "Cancel"
					},
					validation: {
						nameRequired: "Name is required.",
						phoneRequired: "Phone is required.",
						phoneInvalid: "Enter a valid Syrian mobile number (09XXXXXXXX).",
						emailRequired: "Email is required.",
						emailInvalid: "Enter a valid email address.",
						passwordRequired: "Password is required.",
						passwordTooShort: "Password must be at least 8 characters.",
						passwordConfirmationMismatch: "Passwords do not match.",
						roleRequired: "Role is required."
					},
					loadError: "Couldn't load users. You may not have permission to view this page.",
					empty: "No users found.",
					stats: { total: "Total users" }
				},
				roles: {
					names: { member: "Member", operations: "Operations", admin: "Admin" }
				}
			}
		}
	})

	function mountPage() {
		return mount(UsersPage, { global: { plugins: [i18n] } })
	}

	beforeEach(() => {
		vi.clearAllMocks()
		listRoleRecordsMock.mockResolvedValue([memberRole, operationsRole, adminRole, customRole])
		listUsersMock.mockResolvedValue([makeUser({})])
	})

	it("renders a custom role's bare name in the role column, not a raw roles.names.* key", async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.text()).toContain("front-desk")
		expect(wrapper.text()).not.toContain("roles.names.front-desk")
		wrapper.unmount()
	})

	it("still translates a built-in role's name via roles.names.<name> in the role column", async () => {
		listUsersMock.mockResolvedValue([makeUser({ id: 11, roles: ["admin"] })])
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.text()).toContain("Admin")
		expect(wrapper.text()).not.toContain("roles.names.admin")
		wrapper.unmount()
	})

	it("lists the custom role by its bare name (not a translation key) in the role filter dropdown", async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.vm.roleFilterOptions).toContainEqual({ label: "front-desk", value: "front-desk" })
		expect(wrapper.vm.roleFilterOptions).toContainEqual({ label: "Admin", value: "admin" })
		wrapper.unmount()
	})

	it("lists the custom role by its bare name (not a translation key) in the create-user role dropdown, excluding member", async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.vm.createRoleOptions).toContainEqual({ label: "front-desk", value: "front-desk" })
		expect(wrapper.vm.createRoleOptions.find(option => option.value === "member")).toBeUndefined()
		wrapper.unmount()
	})
})
