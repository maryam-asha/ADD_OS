import { flushPromises, mount } from "@vue/test-utils"
import { NRadioGroup, NSelect } from "naive-ui"
import { describe, expect, it, vi } from "vitest"
import { defineComponent, h } from "vue"
import { createI18n } from "vue-i18n"
import ar from "@/add-os/lang/ar"
import en from "@/add-os/lang/en"
import CustodianPicker from "../CustodianPicker.vue"

vi.mock("@/add-os/services/members", () => ({ listMembers: vi.fn().mockResolvedValue([{ id: 3, name: "Lina", phone: "09" }]) }))
vi.mock("@/add-os/services/companies", () => ({ listCompanies: vi.fn().mockResolvedValue([{ id: 8, legal_name: "Acme" }]) }))
vi.mock("@/add-os/modules/hr/components/EmployeeSelect.vue", () => ({
	default: defineComponent({ name: "EmployeeSelect", props: { value: { type: Number, default: null } }, setup: props => () => h("span", { "data-employee": props.value ?? "" }) })
}))

async function mountPicker(value: { type: "hr_employee" | "member" | "company"; id: number } | null) {
	const i18n = createI18n({ legacy: false, locale: "en", messages: { ar, en }, missingWarn: false, fallbackWarn: false })
	const wrapper = mount(CustodianPicker, { props: { value, inline: true }, global: { plugins: [i18n] } })
	await flushPromises()
	return wrapper
}

describe("custodianPicker", () => {
	it("opens on a custodian given from outside, as a filter read from the URL", async () => {
		const wrapper = await mountPicker({ type: "member", id: 3 })
		expect(wrapper.findComponent(NRadioGroup).props("value")).toBe("member")
		expect(wrapper.findComponent(NSelect).props("value")).toBe(3)
		expect(wrapper.emitted("update:value")).toBeUndefined()
	})

	it("follows a custodian changed from outside", async () => {
		const wrapper = await mountPicker(null)
		await wrapper.setProps({ value: { type: "hr_employee", id: 12 } })
		await flushPromises()
		expect(wrapper.findComponent(NRadioGroup).props("value")).toBe("hr_employee")
		expect(wrapper.find("[data-employee]").attributes("data-employee")).toBe("12")
	})
})
