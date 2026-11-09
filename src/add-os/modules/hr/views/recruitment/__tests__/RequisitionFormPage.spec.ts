import { flushPromises, mount } from "@vue/test-utils"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import en from "@/add-os/lang/en/en.json"
import enApprovals from "@/add-os/lang/en/hr-approvals.json"
import enBenefits from "@/add-os/lang/en/hr-benefits.json"
import enLeave from "@/add-os/lang/en/hr-leave.json"
import enPayroll from "@/add-os/lang/en/hr-payroll.json"
import enRecruitment from "@/add-os/lang/en/hr-recruitment.json"
import enHr from "@/add-os/lang/en/hr.json"
import RequisitionFormPage from "../RequisitionFormPage.vue"

const mocks = vi.hoisted(() => ({
	create: vi.fn(),
	fileMine: vi.fn(),
	push: vi.fn(),
	success: vi.fn(),
	error: vi.fn(),
	route: { name: "hrTalent.hrRequisitionCreate" as string, params: {}, query: {} }
}))

vi.mock("@/add-os/services/hr/recruitment", () => ({ createRequisition: mocks.create, fileMyRequisition: mocks.fileMine }))
vi.mock("@/add-os/services/hr/core", () => ({
	listOrgUnits: vi.fn().mockResolvedValue([{ id: 4, name: { ar: "العمليات", en: "Operations" }, is_active: true, parent_id: null, code: null, head_employee_id: null }]),
	listJobGrades: vi.fn().mockResolvedValue([]),
	listPositions: vi.fn().mockResolvedValue([])
}))
vi.mock("@/add-os/modules/hr/components/EmployeeSelect.vue", () => ({ default: { name: "EmployeeSelect", render: () => null } }))
vi.mock("@/add-os/modules/hr/components/payroll/CurrencySelect.vue", () => ({ default: { name: "CurrencySelect", render: () => null } }))
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: mocks.success, error: mocks.error }) }
})
vi.mock("vue-router", async () => {
	const actual = await vi.importActual<typeof import("vue-router")>("vue-router")
	return { ...actual, useRouter: () => ({ push: mocks.push }), useRoute: () => mocks.route }
})

const i18n = createI18n({
	legacy: false,
	locale: "en",
	missingWarn: false,
	fallbackWarn: false,
	messages: { en: { ...en, ...enHr, ...enApprovals, ...enPayroll, ...enBenefits, ...enLeave, ...enRecruitment } }
})

interface Vm {
	form: { titleAr: string; unitId: number | null; managerId: number | null }
	problem: string
	save: () => Promise<void>
}

async function mountPage(routeName: string) {
	mocks.route.name = routeName
	const wrapper = mount(RequisitionFormPage, { global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
	await flushPromises()
	return { wrapper, vm: wrapper.vm as unknown as Vm }
}

describe("requisitionFormPage", () => {
	beforeAll(() => {
		setCurrentLocale("en")
	})
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.create.mockResolvedValue({ id: 3 })
		mocks.fileMine.mockResolvedValue({ id: 4 })
	})
	afterEach(() => {
		document.body.innerHTML = ""
	})
	afterAll(() => {
		setCurrentLocale("ar")
	})

	it("asks HR for the hiring manager, sends it, and returns to the requisitions", async () => {
		const { wrapper, vm } = await mountPage("hrTalent.hrRequisitionCreate")
		Object.assign(vm.form, { titleAr: "منسّق", unitId: 4 })
		await flushPromises()
		expect(vm.problem).not.toBe("")

		vm.form.managerId = 12
		await flushPromises()
		expect(vm.problem).toBe("")
		await vm.save()

		expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ org_unit_id: 4, title: { ar: "منسّق", en: null }, hiring_manager_id: 12 }))
		expect(mocks.fileMine).not.toHaveBeenCalled()
		expect(mocks.push).toHaveBeenCalledWith({ name: "hrTalent.hrRequisitions" })
		wrapper.unmount()
	})

	it("files a manager's own from My HR, without a hiring manager, and returns to its requisitions tab", async () => {
		const { wrapper, vm } = await mountPage("myHr.hrMyRequisitionCreate")
		expect(wrapper.findComponent({ name: "EmployeeSelect" }).exists()).toBe(false)
		Object.assign(vm.form, { titleAr: "منسّق", unitId: 4 })
		await flushPromises()
		expect(vm.problem).toBe("")
		await vm.save()

		expect(mocks.fileMine).toHaveBeenCalledWith(expect.not.objectContaining({ hiring_manager_id: expect.anything() }))
		expect(mocks.create).not.toHaveBeenCalled()
		expect(mocks.push).toHaveBeenCalledWith({ name: "myHr.hrMyRecruitment", query: { tab: "requisitions" } })
		wrapper.unmount()
	})
})
