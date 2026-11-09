import type { Course } from "@/add-os/modules/hr/types/training"
import { flushPromises, mount } from "@vue/test-utils"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import en from "@/add-os/lang/en/en.json"
import enPayroll from "@/add-os/lang/en/hr-payroll.json"
import enTraining from "@/add-os/lang/en/hr-training.json"
import enHr from "@/add-os/lang/en/hr.json"
import { ApiError } from "@/add-os/services/api"
import CourseFormPage from "../CourseFormPage.vue"

const mocks = vi.hoisted(() => ({
	get: vi.fn(),
	create: vi.fn(),
	update: vi.fn(),
	push: vi.fn(),
	success: vi.fn(),
	error: vi.fn(),
	route: { params: {} as Record<string, string>, query: {} }
}))

vi.mock("@/add-os/services/hr/training", () => ({ getCourse: mocks.get, createCourse: mocks.create, updateCourse: mocks.update }))
vi.mock("@/add-os/modules/hr/components/payroll/CurrencySelect.vue", () => ({ default: { name: "CurrencySelect", render: () => null } }))
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: mocks.success, error: mocks.error }) }
})
vi.mock("vue-router", async () => {
	const actual = await vi.importActual<typeof import("vue-router")>("vue-router")
	return { ...actual, useRouter: () => ({ push: mocks.push }), useRoute: () => mocks.route }
})

const i18n = createI18n({ legacy: false, locale: "en", missingWarn: false, fallbackWarn: false, messages: { en: { ...en, ...enHr, ...enPayroll, ...enTraining } } })

interface Vm {
	form: Record<string, unknown>
	problem: string
	save: () => Promise<void>
}

async function mountPage() {
	const wrapper = mount(CourseFormPage, { global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
	await flushPromises()
	return { wrapper, vm: wrapper.vm as unknown as Vm }
}

const course = {
	id: 6,
	code: "first-aid",
	title: { ar: "إسعافات أولية", en: "First aid" },
	description: null,
	provider: "Red Crescent",
	delivery: "in_person",
	duration_hours: "8.0",
	cost: "40.00",
	currency: "USD",
	certification_name: { ar: "مسعف", en: "First aider" },
	certification_valid_months: 24,
	is_active: true
} as unknown as Course

describe("courseFormPage", () => {
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

	it("holds a cost without its currency, then adds the course and returns to the catalogue", async () => {
		mocks.create.mockResolvedValue({ id: 7 })
		const { wrapper, vm } = await mountPage()
		Object.assign(vm.form, { code: "excel", titleAr: "إكسل", cost: 25 })
		await flushPromises()
		expect(vm.problem).not.toBe("")

		vm.form.currency = "USD"
		await flushPromises()
		expect(vm.problem).toBe("")
		await vm.save()

		expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ code: "excel", title: { ar: "إكسل", en: null }, cost: 25, currency: "USD", certification_name: null }))
		expect(mocks.push).toHaveBeenCalledWith({ name: "hrTalent.hrCourses" })
		wrapper.unmount()
	})

	it("edits the course named in the address, keeping its certification", async () => {
		mocks.route.params = { id: "6" }
		mocks.get.mockResolvedValue(course)
		mocks.update.mockResolvedValue({ message: null })
		const { wrapper, vm } = await mountPage()

		expect(mocks.get).toHaveBeenCalledWith(6)
		await vm.save()
		expect(mocks.update).toHaveBeenCalledWith(6, expect.objectContaining({ code: "first-aid", duration_hours: 8, certification_name: { ar: "مسعف", en: "First aider" }, certification_valid_months: 24 }))
		expect(mocks.push).toHaveBeenCalledWith({ name: "hrTalent.hrCourses" })
		wrapper.unmount()
	})

	it("says so instead of a blank form when the course cannot be loaded", async () => {
		mocks.route.params = { id: "6" }
		mocks.get.mockRejectedValue(new ApiError(404, JSON.stringify({ message: "Not found." })))
		const { wrapper } = await mountPage()

		expect(document.body.textContent).toContain("Not found.")
		expect(wrapper.findAll("button").some(b => b.text().trim() === "Save")).toBe(false)
		wrapper.unmount()
	})
})
