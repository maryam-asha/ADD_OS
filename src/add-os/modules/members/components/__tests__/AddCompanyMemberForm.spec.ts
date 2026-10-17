import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import en from "@/add-os/lang/en/en.json"
import { ApiError } from "@/add-os/services/api"
import AddCompanyMemberForm from "../AddCompanyMemberForm.vue"

// The form calls useMessage() directly; mounting without a message provider
// would throw. Mock only that and keep every other naive-ui export real.
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: vi.fn(), error: vi.fn() }) }
})

const sampleUser = { id: 5, name: "Sara", phone: "0999111222", email: "s@add.sy", preferred_language: "ar", preferred_currency: "SYP", status: "active", roles: [] }

const i18n = createI18n({ legacy: false, locale: "en", messages: { en } })

const addMemberMock = vi.fn()

function mountForm() {
	return mount(AddCompanyMemberForm, {
		props: { users: [sampleUser] as never, isLoadingUsers: false, addMember: addMemberMock },
		global: { plugins: [i18n] },
		attachTo: document.body
	})
}

describe("addCompanyMemberForm", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("submits the selected user, door access and admin flag, emits added, and clears itself", async () => {
		addMemberMock.mockResolvedValue({ user_id: 5, door_access_enabled: true, is_admin: false })
		const wrapper = mountForm()
		await flushPromises()

		wrapper.vm.form.user_id = 5
		wrapper.vm.form.door_access_enabled = true
		await wrapper.vm.submit()
		await flushPromises()

		expect(addMemberMock).toHaveBeenCalledWith({ user_id: 5, door_access_enabled: true, is_admin: false })
		expect(wrapper.emitted("added")).toBeTruthy()
		expect(wrapper.vm.form.user_id).toBeNull()
		wrapper.unmount()
	})

	it("on a 422 already-a-member error, does not emit added and keeps the choice", async () => {
		addMemberMock.mockRejectedValue(new ApiError(422, JSON.stringify({ message: "Already a member." })))
		const wrapper = mountForm()
		await flushPromises()

		wrapper.vm.form.user_id = 5
		await wrapper.vm.submit()
		await flushPromises()

		expect(wrapper.emitted("added")).toBeFalsy()
		expect(wrapper.vm.form.user_id).toBe(5)
		wrapper.unmount()
	})

	it("does not call addMember when no user is selected", async () => {
		const wrapper = mountForm()
		await flushPromises()

		await wrapper.vm.submit()
		await flushPromises()

		expect(addMemberMock).not.toHaveBeenCalled()
		wrapper.unmount()
	})
})
