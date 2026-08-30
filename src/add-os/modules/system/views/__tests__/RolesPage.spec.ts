import type { PermissionModule, RoleRecord } from "@/add-os/modules/system/types/role"
import { flushPromises, mount } from "@vue/test-utils"
import { NDialogProvider } from "naive-ui"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { h, nextTick } from "vue"
import { createI18n } from "vue-i18n"

import { ApiError } from "@/add-os/services/api"
import { isModuleFullySelected, isModulePartiallySelected } from "../../config/roles.config"
import RolesPage from "../RolesPage.vue"

const {
	listRoleRecordsMock,
	listPermissionModulesMock,
	createRoleMock,
	updateRoleMock,
	removeRoleMock,
	canManageRolesMock,
	messageMock
} = vi.hoisted(() => ({
	listRoleRecordsMock: vi.fn(),
	listPermissionModulesMock: vi.fn(),
	createRoleMock: vi.fn(),
	updateRoleMock: vi.fn(),
	removeRoleMock: vi.fn(),
	canManageRolesMock: vi.fn(),
	messageMock: { success: vi.fn(), error: vi.fn() }
}))

vi.mock("@/add-os/services/roles", () => ({
	listRoleRecords: listRoleRecordsMock,
	createRole: createRoleMock,
	updateRole: updateRoleMock,
	removeRole: removeRoleMock
}))

vi.mock("@/add-os/services/permissions", () => ({
	listPermissionModules: listPermissionModulesMock
}))

vi.mock("@/add-os/config/permissions", () => ({
	canManageRoles: canManageRolesMock
}))

// Same pitfall every other page spec in this codebase documents: the page
// calls useMessage() directly, which needs a provider it has no reason to
// mount. Mock only useMessage; useDialog stays real (via importActual) so the
// delete-confirmation flow can be driven through the actual rendered dialog,
// same as ResourceTable.spec.ts.
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => messageMock }
})

const memberRole: RoleRecord = { id: 1, name: "member", protected: true, permissions: [] }
const operationsRole: RoleRecord = { id: 2, name: "operations", protected: true, permissions: ["branches.view"] }
const adminRole: RoleRecord = { id: 3, name: "admin", protected: true, permissions: ["branches.view", "branches.update", "branches.delete"] }
const customRole: RoleRecord = { id: 4, name: "front-desk", protected: false, permissions: ["branches.view"] }

const branchesModule: PermissionModule = {
	module: "branches",
	actions: [
		{ name: "branches.view", action: "view" },
		{ name: "branches.update", action: "update" },
		{ name: "branches.delete", action: "delete" }
	]
}

const i18n = createI18n({
	legacy: false,
	locale: "en",
	messages: {
		en: {
			nav: { pages: { roles: "Roles & permissions" } },
			roles: {
				description: "Manage roles and the admin-dashboard permissions each one grants.",
				loadError: "Couldn't load roles. You may not have permission to view this page.",
				empty: "No roles found.",
				names: { member: "Member", operations: "Operations", admin: "Admin" },
				builtIn: "Built-in",
				columns: { name: "Name", permissions: "Permissions", permissionCount: "{count} permissions", actions: "Actions" },
				create: { button: "New role", title: "New role", success: "Role created." },
				edit: { title: "Edit role", button: "Edit", success: "Role updated." },
				delete: { button: "Delete", success: "Role deleted." },
				form: { name: "Name", permissions: "Permissions", selectAll: "Select all", submit: "Save", cancel: "Cancel" }
			},
			resourceCrud: {
				table: {
					deleteAction: "Delete",
					deleteConfirmTitle: "Delete this record?",
					deleteConfirmOk: "Delete",
					deleteConfirmCancel: "Cancel"
				}
			}
		}
	}
})

// RolesPage's own `useDialog()` confirm throws without an ancestor
// `<n-dialog-provider>` — wrapping in one here mirrors the real Provider.vue
// root every page actually mounts under (see ResourceTable.spec.ts).
function mountPage() {
	return mount(
		{ render: () => h(NDialogProvider, null, { default: () => h(RolesPage) }) },
		{ global: { plugins: [i18n] }, attachTo: document.body }
	)
}

function findPage(wrapper: ReturnType<typeof mountPage>) {
	return wrapper.findComponent(RolesPage)
}

describe("rolesPage", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		canManageRolesMock.mockReturnValue(true)
		listRoleRecordsMock.mockResolvedValue([memberRole, operationsRole, adminRole, customRole])
		listPermissionModulesMock.mockResolvedValue([branchesModule])
		createRoleMock.mockResolvedValue({ id: 5, name: "front-desk-2", protected: false, permissions: [] })
		updateRoleMock.mockResolvedValue({ message: "Updated." })
		removeRoleMock.mockResolvedValue(undefined)
	})

	it("lists built-in and custom roles", async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.text()).toContain("Member")
		expect(wrapper.text()).toContain("Operations")
		expect(wrapper.text()).toContain("Admin")
		expect(wrapper.text()).toContain("front-desk")
		wrapper.unmount()
	})

	it("shows a load error instead of the table when the roles list fails to load", async () => {
		listRoleRecordsMock.mockRejectedValue(new ApiError(403, JSON.stringify({ message: "This action is unauthorized." })))
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.text()).toContain("Couldn't load roles.")
		wrapper.unmount()
	})

	it("tags protected roles as built-in, but not a custom role", async () => {
		const wrapper = mountPage()
		await flushPromises()

		const rows = wrapper.findAll("tbody tr")
		const adminRow = rows.find(row => row.text().includes("Admin"))
		const customRow = rows.find(row => row.text().includes("front-desk"))

		expect(adminRow?.text()).toContain("Built-in")
		expect(customRow?.text()).not.toContain("Built-in")
		wrapper.unmount()
	})

	describe("row actions", () => {
		it("renders no Edit and no Delete button for the member row", async () => {
			const wrapper = mountPage()
			await flushPromises()

			const rows = wrapper.findAll("tbody tr")
			const memberRow = rows.find(row => row.text().includes("Member"))

			expect(memberRow?.find('[aria-label="Edit"]').exists()).toBe(false)
			expect(memberRow?.find('[aria-label="Delete"]').exists()).toBe(false)
			wrapper.unmount()
		})

		it("renders Edit but not Delete for a protected non-member role", async () => {
			const wrapper = mountPage()
			await flushPromises()

			const rows = wrapper.findAll("tbody tr")
			const adminRow = rows.find(row => row.text().includes("Admin"))

			expect(adminRow?.find('[aria-label="Edit"]').exists()).toBe(true)
			expect(adminRow?.find('[aria-label="Delete"]').exists()).toBe(false)
			wrapper.unmount()
		})

		it("renders both Edit and Delete for a custom role", async () => {
			const wrapper = mountPage()
			await flushPromises()

			const rows = wrapper.findAll("tbody tr")
			const customRow = rows.find(row => row.text().includes("front-desk"))

			expect(customRow?.find('[aria-label="Edit"]').exists()).toBe(true)
			expect(customRow?.find('[aria-label="Delete"]').exists()).toBe(true)
			wrapper.unmount()
		})
	})

	describe("create button gating", () => {
		it("shows the create button when the user can manage roles", async () => {
			const wrapper = mountPage()
			await flushPromises()

			expect(wrapper.findAll("button").some(b => b.text().includes("New role"))).toBe(true)
			wrapper.unmount()
		})

		it("hides the create button when the user cannot manage roles", async () => {
			canManageRolesMock.mockReturnValue(false)
			const wrapper = mountPage()
			await flushPromises()

			expect(wrapper.findAll("button").some(b => b.text().includes("New role"))).toBe(false)
			wrapper.unmount()
		})
	})

	describe("create", () => {
		it("posts name and the selected permissions", async () => {
			const wrapper = mountPage()
			await flushPromises()
			const page = findPage(wrapper)

			page.vm.openCreate()
			await nextTick()
			page.vm.form.name = "front-desk-2"
			page.vm.form.permissions = ["branches.view", "branches.update"]
			await page.vm.submitCreate()
			await flushPromises()

			expect(createRoleMock).toHaveBeenCalledWith({ name: "front-desk-2", permissions: ["branches.view", "branches.update"] })
			expect(messageMock.success).toHaveBeenCalledWith("Role created.")
			expect(page.vm.modalVisible).toBe(false)
			wrapper.unmount()
		})

		it("surfaces the server's 422 message and keeps the modal open", async () => {
			createRoleMock.mockRejectedValue(new ApiError(422, JSON.stringify({ message: "The name has already been taken." })))
			const wrapper = mountPage()
			await flushPromises()
			const page = findPage(wrapper)

			page.vm.openCreate()
			await nextTick()
			page.vm.form.name = "admin"
			await page.vm.submitCreate()
			await flushPromises()

			expect(messageMock.error).toHaveBeenCalledWith("The name has already been taken.")
			expect(page.vm.modalVisible).toBe(true)
			wrapper.unmount()
		})
	})

	describe("select all / module checkbox state", () => {
		it("toggling a module's select-all on adds every one of its actions", async () => {
			const wrapper = mountPage()
			await flushPromises()
			const page = findPage(wrapper)

			page.vm.openCreate()
			await nextTick()
			page.vm.toggleModule(branchesModule, true)

			expect([...page.vm.form.permissions].sort()).toEqual(["branches.delete", "branches.update", "branches.view"])
			expect(isModuleFullySelected(branchesModule, page.vm.form.permissions)).toBe(true)
			expect(isModulePartiallySelected(branchesModule, page.vm.form.permissions)).toBe(false)
			wrapper.unmount()
		})

		it("toggling select-all off removes every one of the module's actions, and only that module's", async () => {
			const wrapper = mountPage()
			await flushPromises()
			const page = findPage(wrapper)

			page.vm.openCreate()
			await nextTick()
			page.vm.form.permissions = ["branches.view", "branches.update", "branches.delete", "users.view"]
			page.vm.toggleModule(branchesModule, false)

			expect(page.vm.form.permissions).toEqual(["users.view"])
			wrapper.unmount()
		})

		it("reports indeterminate when only some of a module's actions are selected", async () => {
			const wrapper = mountPage()
			await flushPromises()
			const page = findPage(wrapper)

			page.vm.openCreate()
			await nextTick()
			page.vm.form.permissions = ["branches.view"]

			expect(isModulePartiallySelected(branchesModule, page.vm.form.permissions)).toBe(true)
			expect(isModuleFullySelected(branchesModule, page.vm.form.permissions)).toBe(false)
			wrapper.unmount()
		})
	})

	describe("edit", () => {
		it("pre-fills the existing permissions and disables the name field for a protected role", async () => {
			const wrapper = mountPage()
			await flushPromises()
			const page = findPage(wrapper)

			page.vm.openEdit(adminRole)
			await nextTick()

			expect(page.vm.form.name).toBe("admin")
			expect([...page.vm.form.permissions].sort()).toEqual([...adminRole.permissions].sort())

			const inputs = Array.from(document.querySelectorAll(".n-modal input")) as HTMLInputElement[]
			const nameInput = inputs.find(input => input.type !== "checkbox")
			expect(nameInput?.disabled).toBe(true)
			wrapper.unmount()
		})

		it("leaves the name field enabled when editing a non-protected (custom) role", async () => {
			const wrapper = mountPage()
			await flushPromises()
			const page = findPage(wrapper)

			page.vm.openEdit(customRole)
			await nextTick()

			const inputs = Array.from(document.querySelectorAll(".n-modal input")) as HTMLInputElement[]
			const nameInput = inputs.find(input => input.type !== "checkbox")
			expect(nameInput?.disabled).toBe(false)
			wrapper.unmount()
		})

		it("sends name and permissions on update, and surfaces the server's 422 message on failure", async () => {
			updateRoleMock.mockRejectedValue(new ApiError(422, JSON.stringify({ message: "This role is protected and cannot be renamed." })))
			const wrapper = mountPage()
			await flushPromises()
			const page = findPage(wrapper)

			page.vm.openEdit(adminRole)
			await nextTick()
			page.vm.form.name = "renamed"
			await page.vm.submitEdit()
			await flushPromises()

			expect(updateRoleMock).toHaveBeenCalledWith(adminRole.id, { name: "renamed", permissions: adminRole.permissions })
			expect(messageMock.error).toHaveBeenCalledWith("This role is protected and cannot be renamed.")
			expect(page.vm.modalVisible).toBe(true)
			wrapper.unmount()
		})

		it("succeeds, toasts and closes the modal on a valid update", async () => {
			const wrapper = mountPage()
			await flushPromises()
			const page = findPage(wrapper)

			page.vm.openEdit(customRole)
			await nextTick()
			page.vm.form.permissions = ["branches.view", "branches.update"]
			await page.vm.submitEdit()
			await flushPromises()

			expect(updateRoleMock).toHaveBeenCalledWith(customRole.id, { name: "front-desk", permissions: ["branches.view", "branches.update"] })
			expect(messageMock.success).toHaveBeenCalledWith("Role updated.")
			expect(page.vm.modalVisible).toBe(false)
			wrapper.unmount()
		})
	})

	describe("delete", () => {
		it("does not call removeRole before the confirm dialog is accepted", async () => {
			const wrapper = mountPage()
			await flushPromises()

			const rows = wrapper.findAll("tbody tr")
			const customRow = rows.find(row => row.text().includes("front-desk"))
			await customRow!.find('[aria-label="Delete"]').trigger("click")
			await nextTick()

			expect(removeRoleMock).not.toHaveBeenCalled()
			wrapper.unmount()
		})

		it("calls removeRole and refreshes the list once the confirm dialog's positive button is clicked", async () => {
			const wrapper = mountPage()
			await flushPromises()

			const rows = wrapper.findAll("tbody tr")
			const customRow = rows.find(row => row.text().includes("front-desk"))
			await customRow!.find('[aria-label="Delete"]').trigger("click")
			await nextTick()

			// The dialog is teleported to document.body, outside the wrapper's own
			// root node — queried on the document, same as ResourceTable.spec.ts.
			const positiveButton = Array.from(document.querySelectorAll(".n-dialog__action button")).find(
				button => button.textContent?.trim() === "Delete"
			)
			expect(positiveButton).toBeTruthy()
			positiveButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
			await flushPromises()

			expect(removeRoleMock).toHaveBeenCalledWith(customRole.id)
			expect(messageMock.success).toHaveBeenCalledWith("Role deleted.")
			// Refetched once after the initial mount-time load.
			expect(listRoleRecordsMock).toHaveBeenCalledTimes(2)
			wrapper.unmount()
		})

		it("surfaces the server's 422 message (e.g. role still in use) via a toast", async () => {
			removeRoleMock.mockRejectedValue(new ApiError(422, JSON.stringify({ message: "This role still has users assigned." })))
			const wrapper = mountPage()
			await flushPromises()

			const rows = wrapper.findAll("tbody tr")
			const customRow = rows.find(row => row.text().includes("front-desk"))
			await customRow!.find('[aria-label="Delete"]').trigger("click")
			await nextTick()

			const positiveButton = Array.from(document.querySelectorAll(".n-dialog__action button")).find(
				button => button.textContent?.trim() === "Delete"
			)
			positiveButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
			await flushPromises()

			expect(messageMock.error).toHaveBeenCalledWith("This role still has users assigned.")
			wrapper.unmount()
		})
	})
})
