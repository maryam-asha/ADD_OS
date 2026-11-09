import { flushPromises, mount } from "@vue/test-utils"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import en from "@/add-os/lang/en/en.json"
import enPayroll from "@/add-os/lang/en/hr-payroll.json"
import enPerformance from "@/add-os/lang/en/hr-performance.json"
import enHr from "@/add-os/lang/en/hr.json"
import TemplateFormPage from "../TemplateFormPage.vue"

const mocks = vi.hoisted(() => ({
	list: vi.fn(),
	create: vi.fn(),
	update: vi.fn(),
	push: vi.fn(),
	success: vi.fn(),
	error: vi.fn(),
	route: { params: {} as Record<string, string>, query: {} }
}))

vi.mock("@/add-os/services/hr/performance", () => ({ listTemplates: mocks.list, createTemplate: mocks.create, updateTemplate: mocks.update }))
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
	form: { nameAr: string; competencies: { code: string; nameAr: string; nameEn: string; weight: number | null }[] }
	problem: string
	addCompetency: () => void
	save: () => Promise<void>
}

async function mountPage() {
	const wrapper = mount(TemplateFormPage, { global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
	await flushPromises()
	return { wrapper, vm: wrapper.vm as unknown as Vm }
}

const template = {
	id: 3,
	name: { ar: "التقييم السنوي", en: "Annual review" },
	scale_max: 5,
	goals_weight: 40,
	competencies: [{ code: "teamwork", name: { ar: "العمل الجماعي", en: "Teamwork" }, weight: null }],
	is_active: true
}

describe("templateFormPage", () => {
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

	it("starts a new template with one competency, refuses a repeated code, and returns to the list once saved", async () => {
		mocks.create.mockResolvedValue({ id: 9 })
		const { wrapper, vm } = await mountPage()
		expect(vm.form.competencies).toHaveLength(1)

		vm.form.nameAr = "تقييم الفترة"
		Object.assign(vm.form.competencies[0], { code: "quality", nameAr: "الجودة" })
		vm.addCompetency()
		Object.assign(vm.form.competencies[1], { code: "quality", nameAr: "الجودة ثانيةً" })
		await flushPromises()
		expect(vm.problem).not.toBe("")

		vm.form.competencies[1].code = "speed"
		await flushPromises()
		expect(vm.problem).toBe("")
		await vm.save()

		expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ name: { ar: "تقييم الفترة", en: null }, competencies: [expect.objectContaining({ code: "quality" }), expect.objectContaining({ code: "speed" })] }))
		expect(mocks.push).toHaveBeenCalledWith({ name: "hrSettings.hrReviewTemplates" })
		wrapper.unmount()
	})

	it("edits the template named in the address, found in the list", async () => {
		mocks.route.params = { id: "3" }
		mocks.list.mockResolvedValue([template])
		mocks.update.mockResolvedValue({ message: null })
		const { wrapper, vm } = await mountPage()

		expect(vm.form.nameAr).toBe("التقييم السنوي")
		await vm.save()
		expect(mocks.update).toHaveBeenCalledWith(3, expect.objectContaining({ goals_weight: 40, competencies: [{ code: "teamwork", name: { ar: "العمل الجماعي", en: "Teamwork" }, weight: null }] }))
		wrapper.unmount()
	})

	it("says so when the template to edit no longer exists", async () => {
		mocks.route.params = { id: "99" }
		mocks.list.mockResolvedValue([template])
		const { wrapper } = await mountPage()

		expect(document.body.textContent).toContain("This review template no longer exists.")
		wrapper.unmount()
	})
})
