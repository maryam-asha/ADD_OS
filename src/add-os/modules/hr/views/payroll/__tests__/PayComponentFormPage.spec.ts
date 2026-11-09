import type { PayComponent } from "@/add-os/modules/hr/types/payroll"
import { flushPromises, mount } from "@vue/test-utils"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import en from "@/add-os/lang/en/en.json"
import enPayroll from "@/add-os/lang/en/hr-payroll.json"
import enHr from "@/add-os/lang/en/hr.json"
import PayComponentFormPage from "../PayComponentFormPage.vue"

const mocks = vi.hoisted(() => ({
	list: vi.fn(),
	create: vi.fn(),
	update: vi.fn(),
	push: vi.fn(),
	success: vi.fn(),
	error: vi.fn(),
	route: { params: {} as Record<string, string>, query: {} }
}))

vi.mock("@/add-os/services/hr/payroll", () => ({
	listPayComponents: mocks.list,
	listCalculators: vi.fn().mockResolvedValue(["fixed", "rate_table", "donor_share"]),
	listRateTables: vi.fn().mockResolvedValue([]),
	createPayComponent: mocks.create,
	updatePayComponent: mocks.update
}))
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: mocks.success, error: mocks.error }) }
})
vi.mock("vue-router", async () => {
	const actual = await vi.importActual<typeof import("vue-router")>("vue-router")
	return { ...actual, useRouter: () => ({ push: mocks.push }), useRoute: () => mocks.route }
})

const i18n = createI18n({ legacy: false, locale: "en", missingWarn: false, fallbackWarn: false, messages: { en: { ...en, ...enHr, ...enPayroll } } })

function component(overrides: Partial<PayComponent> = {}): PayComponent {
	return {
		id: 1,
		code: "basic",
		name: { ar: "الأساسي", en: "Basic" },
		kind: "earning",
		calculator: "fixed",
		config: null,
		applies_to_all: false,
		taxable: true,
		insurable: true,
		sort: 10,
		is_active: true,
		...overrides
	}
}

interface Vm {
	form: { calculator: string; nameAr: string; code: string }
	config: { base: string; components: string[]; less: string[]; table: string | null }
	rawConfig: string
	rawError: string
	buildConfig: () => unknown
	onCalculator: () => void
	save: () => Promise<void>
}

async function mountPage() {
	const wrapper = mount(PayComponentFormPage, { global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
	await flushPromises()
	return { wrapper, vm: wrapper.vm as unknown as Vm }
}

describe("payComponentFormPage", () => {
	beforeAll(() => {
		setCurrentLocale("en")
	})
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.route.params = {}
		mocks.list.mockResolvedValue([component()])
	})
	afterEach(() => {
		document.body.innerHTML = ""
	})
	afterAll(() => {
		setCurrentLocale("ar")
	})

	it("opens on the server's defaults for each built-in calculator", async () => {
		const { wrapper, vm } = await mountPage()

		expect(vm.buildConfig()).toEqual({ prorate: true })
		vm.form.calculator = "overtime"
		vm.onCalculator()
		expect(vm.buildConfig()).toEqual({ base_components: ["basic"], hours_per_month: 208, multiplier: 1.5 })
		wrapper.unmount()
	})

	it("sends a rate table's components only when the base is chosen lines", async () => {
		const { wrapper, vm } = await mountPage()
		vm.form.calculator = "rate_table"
		vm.onCalculator()
		Object.assign(vm.config, { table: "TAX", base: "taxable", components: ["basic"], less: ["social_ee"] })

		expect(vm.buildConfig()).toEqual({ table: "TAX", base: "taxable", less: ["social_ee"] })
		vm.config.base = "components"
		expect(vm.buildConfig()).toEqual({ table: "TAX", base: "components", components: ["basic"], less: ["social_ee"] })
		wrapper.unmount()
	})

	it("takes a server-added calculator's settings as a JSON object", async () => {
		const { wrapper, vm } = await mountPage()
		vm.form.calculator = "donor_share"
		vm.onCalculator()

		vm.rawConfig = "[1, 2]"
		expect(vm.rawError).toBe("Write the settings as one JSON object.")
		vm.rawConfig = "{ \"share\": 0.4 }"
		expect(vm.rawError).toBe("")
		expect(vm.buildConfig()).toEqual({ share: 0.4 })
		wrapper.unmount()
	})

	it("edits the component named in the address, keeping its settings, then returns to the list", async () => {
		mocks.route.params = { id: "4" }
		mocks.list.mockResolvedValue([component(), component({ id: 4, code: "tax", kind: "deduction", calculator: "rate_table", config: { table: "TAX", base: "taxable", less: ["social_ee"] } })])
		mocks.update.mockResolvedValue({ message: null })
		const { wrapper, vm } = await mountPage()

		expect(vm.buildConfig()).toEqual({ table: "TAX", base: "taxable", less: ["social_ee"] })
		await vm.save()
		expect(mocks.update).toHaveBeenCalledWith(4, expect.objectContaining({ code: "tax", kind: "deduction", config: { table: "TAX", base: "taxable", less: ["social_ee"] } }))
		expect(mocks.push).toHaveBeenCalledWith({ name: "hrSettings.hrPayComponents" })
		wrapper.unmount()
	})

	it("says so when the component to edit no longer exists", async () => {
		mocks.route.params = { id: "99" }
		const { wrapper } = await mountPage()

		expect(document.body.textContent).toContain("This pay component no longer exists.")
		expect(wrapper.findAll("button").some(b => b.text().trim() === "Save")).toBe(false)
		wrapper.unmount()
	})

	it("creates a new component and returns to the list", async () => {
		mocks.create.mockResolvedValue(component({ id: 5 }))
		const { wrapper, vm } = await mountPage()
		vm.form.nameAr = "بدل سكن"
		vm.form.code = "housing"
		await flushPromises()

		await vm.save()
		expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ code: "housing", name: { ar: "بدل سكن", en: null }, calculator: "fixed", config: { prorate: true } }))
		expect(mocks.push).toHaveBeenCalledWith({ name: "hrSettings.hrPayComponents" })
		wrapper.unmount()
	})
})
