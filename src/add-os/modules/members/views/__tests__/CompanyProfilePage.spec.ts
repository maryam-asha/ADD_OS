import type { CompanyMember } from "@/add-os/modules/members/types/company-member"
import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ref } from "vue"
import { createI18n } from "vue-i18n"

import en from "@/add-os/lang/en/en.json"
import { ApiError } from "@/add-os/services/api"
import CompanyProfilePage from "../CompanyProfilePage.vue"

const { useCompanyDetailMock, setDoorAccessMock, setAdminFlagMock, removeMemberMock, refetchMembersMock, refetchCompanyMock, updateStatusMock, transferMock, dialogWarningMock } = vi.hoisted(() => ({
	useCompanyDetailMock: vi.fn(),
	setDoorAccessMock: vi.fn(),
	setAdminFlagMock: vi.fn(),
	removeMemberMock: vi.fn(),
	refetchMembersMock: vi.fn(),
	refetchCompanyMock: vi.fn(),
	updateStatusMock: vi.fn(),
	transferMock: vi.fn(),
	// naive-ui's real useDialog opens a teleported modal and waits for a click —
	// this drives the confirmation directly, as clicking "Remove" would.
	dialogWarningMock: vi.fn((options: { onPositiveClick: () => void }) => options.onPositiveClick())
}))

const sampleCompany = { id: 3, private_office_request_id: 1, legal_name: "Acme LLC", contract_ref: "C-1", branch_id: 1, status: "active", provider: null, office_leases: [] }

// A real ref, not a plain {value} stand-in: the page `defineExpose`s `members`,
// and expose's auto-unwrap only behaves against a genuine ref.
let membersFixture: ReturnType<typeof ref<CompanyMember[]>>

vi.mock("@/add-os/config/permissions", () => ({ canViewOfficeLeases: () => true }))
vi.mock("@/add-os/modules/members/composables/useCompanyDetail", () => ({ useCompanyDetail: useCompanyDetailMock }))
vi.mock("@/add-os/services/branches", () => ({ listBranches: vi.fn().mockResolvedValue([{ id: 1, name: { ar: "الرئيسي", en: "Main" } }]) }))
vi.mock("@/add-os/services/providers", () => ({ listProviders: vi.fn().mockResolvedValue([{ id: 9, name: "Nova Partners" }]) }))
vi.mock("@/add-os/services/companies", () => ({ updateCompanyStatus: updateStatusMock, transferCompanyProvider: transferMock }))
vi.mock("@/add-os/modules/members/components/OfficeLeaseDetailModal.vue", () => ({ default: { name: "OfficeLeaseDetailModal", render: () => null } }))
vi.mock("vue-router", async () => {
	const actual = await vi.importActual<typeof import("vue-router")>("vue-router")
	return { ...actual, useRouter: () => ({ push: vi.fn() }), useRoute: () => ({ params: { id: "3" } }) }
})
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useDialog: () => ({ warning: dialogWarningMock }), useMessage: () => ({ success: vi.fn(), error: vi.fn() }) }
})

const i18n = createI18n({ legacy: false, locale: "en", messages: { en } })

function mountPage() {
	return mount(CompanyProfilePage, { global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
}

describe("companyProfilePage", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		membersFixture = ref([{ user_id: 5, door_access_enabled: true, is_admin: false }])
		useCompanyDetailMock.mockImplementation(() => ({
			company: ref(sampleCompany),
			isLoadingCompany: ref(false),
			companyError: ref(null),
			refetchCompany: refetchCompanyMock,
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
		}))
	})

	it("loads the company named in the URL, once", () => {
		mountPage().unmount()
		expect(useCompanyDetailMock).toHaveBeenCalledTimes(1)
		expect(useCompanyDetailMock).toHaveBeenCalledWith(3)
	})

	it("keeps the lease modal mounted before any lease is opened, so the first open loads it", async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.findComponent({ name: "OfficeLeaseDetailModal" }).exists()).toBe(true)
		wrapper.unmount()
	})

	it("renders the company's name, branch and members", async () => {
		membersFixture.value = [{ id: 1, user: { id: 5, name: "Sara Ahmad", phone: "+963912345678" }, door_access_enabled: true, is_admin: false }]
		const wrapper = mountPage()
		await flushPromises()

		expect(document.body.textContent).toContain("Acme LLC")
		// The branch name follows the app locale (currentLocale), which defaults to Arabic.
		expect(document.body.textContent).toContain("الرئيسي")
		expect(document.body.textContent).toContain("Sara Ahmad")
		expect(document.body.textContent).toContain("+963912345678")
		wrapper.unmount()
	})

	it("toggling door access updates optimistically, then persists via setDoorAccess", async () => {
		setDoorAccessMock.mockResolvedValue(undefined)
		const wrapper = mountPage()
		await flushPromises()

		const member = wrapper.vm.members[0]
		await wrapper.vm.onToggleDoorAccess(member, false)

		expect(setDoorAccessMock).toHaveBeenCalledWith(5, { door_access_enabled: false })
		expect(member.door_access_enabled).toBe(false)
		wrapper.unmount()
	})

	it("reverts the optimistic toggle and refetches members on failure", async () => {
		setDoorAccessMock.mockRejectedValue(new ApiError(500, ""))
		const wrapper = mountPage()
		await flushPromises()

		const member = wrapper.vm.members[0]
		await wrapper.vm.onToggleDoorAccess(member, false)

		expect(member.door_access_enabled).toBe(true)
		expect(refetchMembersMock).toHaveBeenCalled()
		wrapper.unmount()
	})

	it("toggling the admin flag persists via setAdminFlag", async () => {
		setAdminFlagMock.mockResolvedValue(undefined)
		const wrapper = mountPage()
		await flushPromises()

		const member = wrapper.vm.members[0]
		await wrapper.vm.onToggleAdmin(member, true)

		expect(setAdminFlagMock).toHaveBeenCalledWith(5, { is_admin: true })
		expect(member.is_admin).toBe(true)
		wrapper.unmount()
	})

	it("removes a member through a confirmation, then calls removeMember", async () => {
		removeMemberMock.mockResolvedValue(undefined)
		const wrapper = mountPage()
		await flushPromises()

		wrapper.vm.confirmRemove(wrapper.vm.members[0])
		await flushPromises()

		expect(dialogWarningMock).toHaveBeenCalledOnce()
		expect(removeMemberMock).toHaveBeenCalledWith(5)
		wrapper.unmount()
	})

	it("saves a status change inline and reloads the company", async () => {
		updateStatusMock.mockResolvedValue({ message: "ok" })
		const wrapper = mountPage()
		await flushPromises()

		wrapper.vm.statusDraft = "inactive"
		await wrapper.vm.submitStatus()

		expect(updateStatusMock).toHaveBeenCalledWith(3, { status: "inactive" })
		expect(refetchCompanyMock).toHaveBeenCalled()
		wrapper.unmount()
	})

	it("transfers to a provider, and sends null for direct management", async () => {
		transferMock.mockResolvedValue({ message: "ok" })
		const wrapper = mountPage()
		await flushPromises()

		wrapper.vm.providerDraft = 9
		await wrapper.vm.submitTransfer()
		expect(transferMock).toHaveBeenLastCalledWith(3, 9)

		wrapper.vm.providerDraft = 0
		await wrapper.vm.submitTransfer()
		expect(transferMock).toHaveBeenLastCalledWith(3, null)
		expect(refetchCompanyMock).toHaveBeenCalledTimes(2)
		wrapper.unmount()
	})
})
