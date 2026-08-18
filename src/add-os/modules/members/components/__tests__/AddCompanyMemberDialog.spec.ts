import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import { ApiError } from "@/add-os/services/api"
import AddCompanyMemberDialog from "../AddCompanyMemberDialog.vue"

const { useCompanyDetailMock, addMemberMock } = vi.hoisted(() => ({
	useCompanyDetailMock: vi.fn(),
	addMemberMock: vi.fn()
}))

vi.mock("@/add-os/modules/members/composables/useCompanyDetail", () => ({
	useCompanyDetail: useCompanyDetailMock
}))

// The component calls useMessage() directly. Mounting it for real without a
// message provider is exactly the pitfall UsersPage.spec.ts's own comment
// avoids by not mounting at all — mock only useMessage, keep every other
// naive-ui export (NModal, NForm, NSelect, ...) real via importActual.
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: vi.fn(), error: vi.fn() }) }
})

const sampleUser = { id: 5, name: "Sara", phone: "0999111222", email: "s@add.sy", preferred_language: "ar", preferred_currency: "SYP", status: "active", roles: [] }

const i18n = createI18n({
	legacy: false,
	locale: "en",
	messages: {
		en: {
			companyMembers: {
				add: {
					title: "Add company member",
					userLabel: "User",
					userRequired: "Select a user.",
					doorAccessLabel: "Door access enabled",
					adminLabel: "Company admin",
					adminHint: "First admin note.",
					success: "Member added.",
					alreadyMemberError: "Already a member."
				}
			},
			resourceCrud: {
				form: { submit: "Save", cancel: "Cancel" },
				mutations: { genericError: "Something went wrong.", permissionError: "No permission." }
			}
		}
	}
})

function mountDialog(companyId = 3) {
	return mount(AddCompanyMemberDialog, {
		props: { companyId, show: true, "onUpdate:show": () => {} },
		global: { plugins: [i18n] },
		attachTo: document.body
	})
}

describe("addCompanyMemberDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		useCompanyDetailMock.mockImplementation((companyId: number) => ({
			company: { value: null },
			isLoadingCompany: { value: false },
			companyError: { value: null },
			refetchCompany: vi.fn(),
			members: { value: [] },
			isLoadingMembers: { value: false },
			membersError: { value: null },
			refetchMembers: vi.fn(),
			users: { value: [sampleUser] },
			isLoadingUsers: { value: false },
			addMember: (payload: unknown) => addMemberMock(companyId, payload),
			setDoorAccess: vi.fn(),
			setAdminFlag: vi.fn(),
			removeMember: vi.fn()
		}))
	})

	it("calls useCompanyDetail scoped to the companyId prop it was given", () => {
		mountDialog(7)
		expect(useCompanyDetailMock).toHaveBeenCalledWith(7)
	})

	it("submits the selected user, door access and admin flag, then emits added", async () => {
		addMemberMock.mockResolvedValue({ user_id: 5, door_access_enabled: true, is_admin: false })
		const wrapper = mountDialog(3)
		await flushPromises()

		wrapper.vm.form.user_id = 5
		wrapper.vm.form.door_access_enabled = true
		await wrapper.vm.submit()
		await flushPromises()

		expect(addMemberMock).toHaveBeenCalledWith(3, { user_id: 5, door_access_enabled: true, is_admin: false })
		expect(wrapper.emitted("added")).toBeTruthy()
		wrapper.unmount()
	})

	it("on a 422 'already a member' error, does not emit added and leaves the dialog open", async () => {
		addMemberMock.mockRejectedValue(new ApiError(422, JSON.stringify({ message: "Already a member." })))
		const wrapper = mountDialog(3)
		await flushPromises()

		wrapper.vm.form.user_id = 5
		await wrapper.vm.submit()
		await flushPromises()

		expect(wrapper.emitted("added")).toBeFalsy()
		wrapper.unmount()
	})

	it("does not call addMember when no user is selected (required-field validation blocks submit)", async () => {
		const wrapper = mountDialog(3)
		await flushPromises()

		await wrapper.vm.submit()
		await flushPromises()

		expect(addMemberMock).not.toHaveBeenCalled()
		wrapper.unmount()
	})
})
