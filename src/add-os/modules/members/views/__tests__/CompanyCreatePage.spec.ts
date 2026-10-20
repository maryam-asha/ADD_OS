import type { VueWrapper } from "@vue/test-utils"
import { flushPromises, mount } from "@vue/test-utils"
import { NButton, NInput, NSelect } from "naive-ui"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { currentLocale } from "@/add-os/lang/currentLocale"
import en from "@/add-os/lang/en/en.json"
import { ApiError } from "@/add-os/services/api"
import { createCompany } from "@/add-os/services/companies"
import CompanyCreatePage from "../CompanyCreatePage.vue"

const mockPush = vi.fn()

vi.mock("@/add-os/services/companies", () => ({
	createCompany: vi.fn().mockResolvedValue({ id: 42 })
}))

vi.mock("@/add-os/services/private-office-requests", () => ({
	listPrivateOfficeRequests: vi.fn().mockResolvedValue([
		{ id: 7, prospect_name: "Horizon Digital", contact: "0999 000 000", status: "quoted", quote_ref: "Q-7", provider_id: null, provider: null, company_id: null, contract_ref: "ADD-C-7" },
		{ id: 8, prospect_name: "Not quoted yet", contact: "", status: "requested", quote_ref: null, company_id: null },
		{ id: 9, prospect_name: "Already a company", contact: "", status: "quoted", quote_ref: "Q-9", company_id: 3 }
	])
}))

vi.mock("@/add-os/services/spaces", () => ({
	listSpaces: vi.fn().mockResolvedValue([
		{ id: 3, name: { ar: "مكتب ٣", en: "Office 3" }, space_type: "business", status: "active", capacity: 4 },
		{ id: 5, name: { ar: "مساحة مشتركة", en: "Open floor" }, space_type: "coworking", status: "active", capacity: 30 }
	])
}))

vi.mock("@/add-os/services/currencies", () => ({
	listCurrencies: vi.fn().mockResolvedValue([
		{ code: "USD", name: { ar: "دولار أمريكي", en: "US Dollar" }, symbol: "$", is_base: true, is_active: true },
		{ code: "EUR", name: { ar: "يورو", en: "Euro" }, symbol: "€", is_base: false, is_active: false }
	])
}))

vi.mock("vue-router", async () => {
	const actual = await vi.importActual<typeof import("vue-router")>("vue-router")
	return { ...actual, useRouter: () => ({ push: mockPush }) }
})

vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: vi.fn(), error: vi.fn() }) }
})

const i18n = createI18n({ legacy: false, locale: "en", messages: { en } })
const page = en.companies.createPage

async function mountPage() {
	const wrapper = mount(CompanyCreatePage, { global: { plugins: [i18n], stubs: { Icon: true } } })
	await flushPromises()
	return wrapper
}

function button(wrapper: VueWrapper, label: string) {
	return wrapper.findAllComponents(NButton).find(b => b.text() === label)!
}

/** The heading above the form names the step on screen. */
function stepTitle(wrapper: VueWrapper) {
	return wrapper.find("h2").text()
}

async function press(wrapper: VueWrapper, label: string) {
	await button(wrapper, label).trigger("click")
	await flushPromises()
}

async function enterAmount(wrapper: VueWrapper, amount: string) {
	wrapper.findAllComponents(NInput).find(i => i.attributes("data-test") === "monthly-amount")!.vm.$emit("update:value", amount)
	await flushPromises()
}

async function completeCompanyStep(wrapper: VueWrapper) {
	wrapper.findComponent(NSelect).vm.$emit("update:value", 7)
	await flushPromises()
	await press(wrapper, page.next)
}

async function completeOfficeStep(wrapper: VueWrapper) {
	wrapper.findComponent(NSelect).vm.$emit("update:value", 3)
	await flushPromises()
	await press(wrapper, page.next)
}

describe("companyCreatePage", () => {
	beforeEach(() => {
		mockPush.mockReset()
		vi.mocked(createCompany).mockClear()
	})

	it("shows one step at a time, starting with the company", async () => {
		const wrapper = await mountPage()

		expect(stepTitle(wrapper)).toBe(page.steps.company)
		expect(button(wrapper, page.back)).toBeUndefined()
		expect(button(wrapper, page.submit)).toBeUndefined()
	})

	it("offers only quoted requests that are not a company yet", async () => {
		const wrapper = await mountPage()

		const options = wrapper.findComponent(NSelect).props("options") as { value: number }[]
		expect(options.map(o => o.value)).toEqual([7])
	})

	it("does not move on until the step is filled in", async () => {
		const wrapper = await mountPage()
		await press(wrapper, page.next)

		expect(stepTitle(wrapper)).toBe(page.steps.company)
	})

	it("fills the legal name and contract reference from the chosen request", async () => {
		const wrapper = await mountPage()
		wrapper.findComponent(NSelect).vm.$emit("update:value", 7)
		await flushPromises()

		const inputs = wrapper.findAllComponents(NInput)
		expect(inputs[0]!.props("value")).toBe("Horizon Digital")
		expect(inputs[1]!.props("value")).toBe("ADD-C-7")
		expect(wrapper.find("[data-test=summary]").text()).toContain("Horizon Digital")
	})

	it("goes back to an earlier step with what was entered still there", async () => {
		const wrapper = await mountPage()
		await completeCompanyStep(wrapper)
		expect(stepTitle(wrapper)).toBe(page.steps.office)

		await press(wrapper, page.back)
		expect(stepTitle(wrapper)).toBe(page.steps.company)
		expect(wrapper.findComponent(NSelect).props("value")).toBe(7)
	})

	it("offers only private offices", async () => {
		const wrapper = await mountPage()
		await completeCompanyStep(wrapper)

		const options = wrapper.findComponent(NSelect).props("options") as { value: number }[]
		expect(options.map(o => o.value)).toEqual([3])
	})

	it("names each active currency in words, not as an object", async () => {
		const wrapper = await mountPage()
		await completeCompanyStep(wrapper)
		await completeOfficeStep(wrapper)

		const currency = wrapper.findAllComponents(NSelect).find(s => (s.props("options") as { value: unknown }[]).some(o => o.value === "USD"))!
		const labels = (currency.props("options") as { label: string }[]).map(o => o.label)
		// The name in the language the app is shown in.
		expect(labels).toEqual([`USD ($) ${pickLocalized({ ar: "دولار أمريكي", en: "US Dollar" }, currentLocale.value)}`])
		expect(labels[0]).not.toContain("[object")
	})

	it("creates the company from all three steps and opens it", async () => {
		const wrapper = await mountPage()
		await completeCompanyStep(wrapper)
		await completeOfficeStep(wrapper)
		expect(stepTitle(wrapper)).toBe(page.steps.terms)

		await enterAmount(wrapper, "500")
		await press(wrapper, page.submit)

		expect(createCompany).toHaveBeenCalledWith(expect.objectContaining({
			private_office_request_id: 7,
			legal_name: "Horizon Digital",
			contract_ref: "ADD-C-7",
			space_id: 3,
			duration_months: 12,
			billing_cycle_months: 3,
			monthly_amount: "500",
			currency: "USD",
			auto_renew: true
		}))
		// A request with no provider has no payer to choose.
		expect(vi.mocked(createCompany).mock.calls[0]![0]).not.toHaveProperty("billed_to")
		expect(mockPush).toHaveBeenCalledWith({ name: "members.companyProfile", params: { id: 42 } })
	})

	it("refuses an amount that is not above zero", async () => {
		const wrapper = await mountPage()
		await completeCompanyStep(wrapper)
		await completeOfficeStep(wrapper)

		await enterAmount(wrapper, "0")
		await press(wrapper, page.submit)

		expect(createCompany).not.toHaveBeenCalled()
		expect(wrapper.text()).toContain(page.amountInvalid)
	})

	it("returns to the step holding a field the server refused, and shows why there", async () => {
		vi.mocked(createCompany).mockRejectedValueOnce(
			new ApiError(422, JSON.stringify({ message: "Invalid", errors: { contract_ref: ["This contract reference is already used."] } }))
		)
		const wrapper = await mountPage()
		await completeCompanyStep(wrapper)
		await completeOfficeStep(wrapper)
		await enterAmount(wrapper, "500")
		await press(wrapper, page.submit)

		expect(stepTitle(wrapper)).toBe(page.steps.company)
		expect(wrapper.text()).toContain("This contract reference is already used.")
		expect(mockPush).not.toHaveBeenCalled()
	})
})
