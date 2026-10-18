import type { ContactPayload } from "@/add-os/modules/hr/types/hr"
import type { UpdateResult } from "@/add-os/services/hr/core"
import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import en from "@/add-os/lang/en/en.json"
import enHr from "@/add-os/lang/en/hr.json"
import { ApiError } from "@/add-os/services/api"
import PeopleListModal from "../PeopleListModal.vue"

const { successMock } = vi.hoisted(() => ({ successMock: vi.fn() }))

vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: successMock, error: vi.fn() }) }
})

const i18n = createI18n({ legacy: false, locale: "en", messages: { en: { ...en, ...enHr } } })

interface ModalVm { rows: { name: string; relation: string; phone: string }[]; save: () => Promise<void>; error: string; errorFor: (i: number, f: string) => boolean }

async function mountModal(saveContacts: (rows: ContactPayload[]) => Promise<UpdateResult>) {
	const contacts = [{ id: 1, name: "Salma", relation: "Sister", phone: "+963944000001" }]
	const wrapper = mount(PeopleListModal, { props: { kind: "contacts", contacts, saveContacts, show: false }, global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
	await wrapper.setProps({ show: true })
	await flushPromises()
	return { wrapper, vm: wrapper.vm as unknown as ModalVm }
}

describe("peopleListModal", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("sends the whole list and shows the server's message", async () => {
		const save = vi.fn().mockResolvedValue({ message: "Emergency contacts updated." })
		const { wrapper, vm } = await mountModal(save)

		vm.rows.push({ name: "Omar", relation: "Brother", phone: "+963944000002" })
		await vm.save()
		await flushPromises()

		expect(save).toHaveBeenCalledWith([
			{ name: "Salma", relation: "Sister", phone: "+963944000001" },
			{ name: "Omar", relation: "Brother", phone: "+963944000002" }
		])
		expect(successMock).toHaveBeenCalledWith("Emergency contacts updated.")
		expect(wrapper.emitted("saved")).toHaveLength(1)
		wrapper.unmount()
	})

	it("marks the row the server refused and shows its message", async () => {
		const save = vi.fn().mockRejectedValue(new ApiError(422, JSON.stringify({ message: "Invalid.", errors: { "contacts.0.phone": ["The phone may not be greater than 32 characters."] } })))
		const { wrapper, vm } = await mountModal(save)

		await vm.save()
		await flushPromises()

		expect(vm.errorFor(0, "phone")).toBe(true)
		expect(vm.error).toBe("The phone may not be greater than 32 characters.")
		expect(wrapper.emitted("saved")).toBeUndefined()
		wrapper.unmount()
	})

	it("refuses an incomplete row before sending anything", async () => {
		const save = vi.fn()
		const { wrapper, vm } = await mountModal(save)

		vm.rows.push({ name: "", relation: "", phone: "" })
		await vm.save()

		expect(save).not.toHaveBeenCalled()
		expect(vm.error).toBe("Fill in every row, or remove the empty ones.")
		wrapper.unmount()
	})
})
