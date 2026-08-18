import { readFileSync } from "node:fs"
import path from "node:path"
import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ref } from "vue"
import { createI18n } from "vue-i18n"

import { ApiError } from "@/add-os/services/api"
import CompanyDetailPanel from "../CompanyDetailPanel.vue"

const COMPONENT_FILE = path.resolve(__dirname, "..", "CompanyDetailPanel.vue")

const sampleCompany = { id: 3, private_office_request_id: 1, legal_name: "Acme LLC", contract_ref: "C-1", branch_id: 1, status: "active" }

const setDoorAccessMock = vi.fn()
const setAdminFlagMock = vi.fn()
const removeMemberMock = vi.fn()
const refetchMembersMock = vi.fn()
// A real ref, not a plain {value: ...} stand-in: this component `defineExpose`s
// `members` directly (Step 3 below), and Vue's expose/auto-unwrap machinery only
// behaves correctly against a genuine ref — matching what the real
// useCompanyDetail (Task 9) actually returns.
let membersFixture: ReturnType<typeof ref<{ user_id: number; door_access_enabled: boolean; is_admin: boolean }[]>>

vi.mock("@/add-os/modules/members/composables/useCompanyDetail", () => ({
	useCompanyDetail: () => ({
		company: ref(sampleCompany),
		isLoadingCompany: ref(false),
		companyError: ref(null),
		refetchCompany: vi.fn(),
		members: membersFixture,
		isLoadingMembers: ref(false),
		membersError: ref(null),
		refetchMembers: refetchMembersMock,
		users: ref([]),
		isLoadingUsers: ref(false),
		addMember: vi.fn(),
		setDoorAccess: setDoorAccessMock,
		setAdminFlag: setAdminFlagMock,
		removeMember: removeMemberMock
	})
}))

// naive-ui's real useDialog opens a teleported modal and waits for a click —
// this test drives the confirmation directly by invoking onPositiveClick,
// the same way a user clicking "Remove" in the real dialog would.
const dialogWarningMock = vi.fn((options: { onPositiveClick: () => void }) => options.onPositiveClick())
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useDialog: () => ({ warning: dialogWarningMock }), useMessage: () => ({ success: vi.fn(), error: vi.fn() }) }
})

const i18n = createI18n({
	legacy: false,
	locale: "en",
	messages: {
		en: {
			companies: { detail: { title: "Company", loadError: "Load error." }, columns: { contractRef: "Contract ref", status: "Status" }, status: { active: "Active", inactive: "Inactive" } },
			companyMembers: {
				add: { button: "Add member" },
				columns: { userId: "User ID", doorAccess: "Door access", isAdmin: "Admin" },
				remove: { confirmTitle: "Remove?", confirmOk: "Remove", confirmCancel: "Cancel", success: "Removed." }
			},
			resourceCrud: { table: { actionsColumn: "Actions", deleteAction: "Delete" }, mutations: { genericError: "Error.", permissionError: "No permission." } }
		}
	}
})

function mountPanel(companyId = 3) {
	return mount(CompanyDetailPanel, {
		props: { companyId, show: true, "onUpdate:show": () => {} },
		global: { plugins: [i18n] },
		attachTo: document.body
	})
}

describe("companyDetailPanel", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		membersFixture = ref([{ user_id: 5, door_access_enabled: true, is_admin: false }])
	})

	it("renders the company's legal name and shows its members", async () => {
		const wrapper = mountPanel()
		await flushPromises()

		expect(document.body.textContent).toContain("Acme LLC")
		wrapper.unmount()
	})

	it("imports AddCompanyMemberDialog from the shared component path, not a local copy", () => {
		const source = readFileSync(COMPONENT_FILE, "utf8")
		expect(source).toContain('from "./AddCompanyMemberDialog.vue"')
	})

	it("exposes refetchCompany for a parent to call after an external status change", async () => {
		const wrapper = mountPanel()
		await flushPromises()

		expect(typeof wrapper.vm.refetchCompany).toBe("function")
		wrapper.unmount()
	})

	it("toggling door access updates optimistically, then persists via setDoorAccess", async () => {
		setDoorAccessMock.mockResolvedValue(undefined)
		const wrapper = mountPanel()
		await flushPromises()

		const member = wrapper.vm.members[0]
		await wrapper.vm.onToggleDoorAccess(member, false)

		expect(setDoorAccessMock).toHaveBeenCalledWith(5, { door_access_enabled: false })
		expect(member.door_access_enabled).toBe(false)
		wrapper.unmount()
	})

	it("reverts the optimistic toggle and refetches members on failure", async () => {
		setDoorAccessMock.mockRejectedValue(new ApiError(500, ""))
		const wrapper = mountPanel()
		await flushPromises()

		const member = wrapper.vm.members[0]
		await wrapper.vm.onToggleDoorAccess(member, false)

		expect(member.door_access_enabled).toBe(true) // reverted to its original value
		expect(refetchMembersMock).toHaveBeenCalled()
		wrapper.unmount()
	})

	it("toggling the admin flag persists via setAdminFlag", async () => {
		setAdminFlagMock.mockResolvedValue(undefined)
		const wrapper = mountPanel()
		await flushPromises()

		const member = wrapper.vm.members[0]
		await wrapper.vm.onToggleAdmin(member, true)

		expect(setAdminFlagMock).toHaveBeenCalledWith(5, { is_admin: true })
		expect(member.is_admin).toBe(true)
		wrapper.unmount()
	})

	it("removes a member through a confirmation dialog, then calls removeMember", async () => {
		removeMemberMock.mockResolvedValue(undefined)
		const wrapper = mountPanel()
		await flushPromises()

		wrapper.vm.confirmRemove(wrapper.vm.members[0])
		await flushPromises()

		expect(dialogWarningMock).toHaveBeenCalledOnce()
		expect(removeMemberMock).toHaveBeenCalledWith(5)
		wrapper.unmount()
	})
})
