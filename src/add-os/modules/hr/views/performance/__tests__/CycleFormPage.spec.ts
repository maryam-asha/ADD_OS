import { flushPromises, mount } from "@vue/test-utils"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import en from "@/add-os/lang/en/en.json"
import enPayroll from "@/add-os/lang/en/hr-payroll.json"
import enPerformance from "@/add-os/lang/en/hr-performance.json"
import enHr from "@/add-os/lang/en/hr.json"
import CycleFormPage from "../CycleFormPage.vue"

const mocks = vi.hoisted(() => ({
	get: vi.fn(),
	create: vi.fn(),
	update: vi.fn(),
	push: vi.fn(),
	success: vi.fn(),
	error: vi.fn(),
	route: { params: {} as Record<string, string>, query: {} }
}))

vi.mock("@/add-os/services/hr/performance", () => ({
	getCycle: mocks.get,
	createCycle: mocks.create,
	updateCycle: mocks.update,
	listTemplates: vi.fn().mockResolvedValue([{ id: 3, name: { ar: "سنوي", en: "Annual" }, is_active: true }])
}))
vi.mock("@/add-os/services/hr/core", () => ({ listOrgUnits: vi.fn().mockResolvedValue([]) }))
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: mocks.success, error: mocks.error }) }
})
vi.mock("vue-router", async () => {
	const actual = await vi.importActual<typeof import("vue-router")>("vue-router")
	return { ...actual, useRouter: () => ({ push: mocks.push }), useRoute: () => mocks.route }
})

const i18n = createI18n({ legacy: false, locale: "en", missingWarn: false, fallbackWarn: false, messages: { en: { ...en, ...enHr, ...enPayroll, ...enPerformance } } })

interface Vm {
	form: Record<string, unknown>
	problem: string
	save: () => Promise<void>
}

async function mountPage() {
	const wrapper = mount(CycleFormPage, { global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
	await flushPromises()
	return { wrapper, vm: wrapper.vm as unknown as Vm }
}

describe("cycleFormPage", () => {
	beforeAll(() => {
		setCurrentLocale("en")
	})
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.route.params = {}
	})
	afterEach(() => {
		document.body.innerHTML = ""
	})
	afterAll(() => {
		setCurrentLocale("ar")
	})

	it("refuses a period that ends before it starts, then opens the new cycle's own page", async () => {
		mocks.create.mockResolvedValue({ id: 21 })
		const { wrapper, vm } = await mountPage()
		Object.assign(vm.form, { nameAr: "تقييم 2026", templateId: 3, periodStart: "2026-12-31", periodEnd: "2026-01-01" })
		await flushPromises()
		expect(vm.problem).not.toBe("")

		vm.form.periodEnd = "2026-12-31"
		vm.form.periodStart = "2026-01-01"
		await flushPromises()
		expect(vm.problem).toBe("")
		await vm.save()

		expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ review_template_id: 3, period_start: "2026-01-01", period_end: "2026-12-31", org_unit_id: null }))
		expect(mocks.push).toHaveBeenCalledWith({ name: "hrTalent.hrReviewCycle", params: { id: 21 } })
		wrapper.unmount()
	})

	it("edits the draft named in the address and returns to it", async () => {
		mocks.route.params = { id: "21" }
		mocks.get.mockResolvedValue({
			id: 21,
			name: { ar: "تقييم 2026", en: null },
			review_template_id: 3,
			org_unit_id: null,
			period_start: "2026-01-01",
			period_end: "2026-12-31",
			goals_due_on: null,
			self_due_on: "2027-01-15",
			manager_due_on: null
		})
		mocks.update.mockResolvedValue({ message: null })
		const { wrapper, vm } = await mountPage()

		expect(mocks.get).toHaveBeenCalledWith(21)
		await vm.save()
		expect(mocks.update).toHaveBeenCalledWith(21, expect.objectContaining({ self_due_on: "2027-01-15" }))
		expect(mocks.push).toHaveBeenCalledWith({ name: "hrTalent.hrReviewCycle", params: { id: 21 } })
		wrapper.unmount()
	})
})
