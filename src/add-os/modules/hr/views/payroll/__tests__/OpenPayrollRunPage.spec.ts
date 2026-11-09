import { flushPromises, mount } from "@vue/test-utils"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import en from "@/add-os/lang/en/en.json"
import enPayroll from "@/add-os/lang/en/hr-payroll.json"
import enHr from "@/add-os/lang/en/hr.json"
import { todayIso } from "@/add-os/modules/hr/utils/leave"
import OpenPayrollRunPage from "../OpenPayrollRunPage.vue"

const mocks = vi.hoisted(() => ({
	openPayrollRun: vi.fn(),
	push: vi.fn(),
	success: vi.fn(),
	error: vi.fn()
}))

vi.mock("@/add-os/services/hr/payroll", () => ({ openPayrollRun: mocks.openPayrollRun }))
vi.mock("@/add-os/modules/hr/components/EmployeeMultiSelect.vue", () => ({ default: { name: "EmployeeMultiSelect", render: () => null } }))
vi.mock("@/add-os/modules/hr/components/payroll/CurrencySelect.vue", () => ({ default: { name: "CurrencySelect", render: () => null } }))
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: mocks.success, error: mocks.error }) }
})
vi.mock("vue-router", async () => {
	const actual = await vi.importActual<typeof import("vue-router")>("vue-router")
	return { ...actual, useRouter: () => ({ push: mocks.push }), useRoute: () => ({ params: {}, query: {} }) }
})

const i18n = createI18n({ legacy: false, locale: "en", missingWarn: false, fallbackWarn: false, messages: { en: { ...en, ...enHr, ...enPayroll } } })

function mountPage() {
	return mount(OpenPayrollRunPage, { global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
}

function openButton(wrapper: ReturnType<typeof mountPage>) {
	return wrapper.findAll("button").find(b => b.text().trim() === "Open payroll")!
}

describe("openPayrollRunPage", () => {
	beforeAll(() => {
		setCurrentLocale("en")
	})
	beforeEach(() => {
		vi.clearAllMocks()
	})
	afterEach(() => {
		document.body.innerHTML = ""
	})
	afterAll(() => {
		setCurrentLocale("ar")
	})

	it("opens this month's regular run and goes to the run's own page", async () => {
		mocks.openPayrollRun.mockResolvedValue({ id: 12 })
		const wrapper = mountPage()
		await flushPromises()

		await openButton(wrapper).trigger("click")
		await flushPromises()

		const [year, month] = todayIso().split("-").map(Number)
		expect(mocks.openPayrollRun).toHaveBeenCalledWith({
			year,
			month,
			kind: "regular",
			currency: null,
			parallel_run: false,
			employee_ids: null,
			notes: null
		})
		expect(mocks.push).toHaveBeenCalledWith({ name: "hrPay.hrPayrollRun", params: { id: 12 } })
		wrapper.unmount()
	})

	it("asks for the employees of an off-cycle run, and holds the button until one is chosen", async () => {
		const wrapper = mountPage()
		await flushPromises()

		const vm = wrapper.vm as unknown as { form: { kind: string; employeeIds: number[] } }
		vm.form.kind = "off_cycle"
		await flushPromises()

		expect(wrapper.findComponent({ name: "EmployeeMultiSelect" }).exists()).toBe(true)
		expect(openButton(wrapper).attributes("disabled")).toBeDefined()

		vm.form.employeeIds = [3]
		await flushPromises()
		expect(openButton(wrapper).attributes("disabled")).toBeUndefined()
		wrapper.unmount()
	})

	it("returns to the runs without opening one on Cancel", async () => {
		const wrapper = mountPage()
		await flushPromises()

		await wrapper.findAll("button").find(b => b.text().trim() === "Cancel")!.trigger("click")

		expect(mocks.openPayrollRun).not.toHaveBeenCalled()
		expect(mocks.push).toHaveBeenCalledWith({ name: "hrPay.hrPayrollRuns" })
		wrapper.unmount()
	})
})
