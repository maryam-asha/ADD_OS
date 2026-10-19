import type { Benefit } from "@/add-os/modules/hr/types/benefits"
import type { PayComponent } from "@/add-os/modules/hr/types/payroll"
import { flushPromises, mount } from "@vue/test-utils"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import en from "@/add-os/lang/en/en.json"
import enApprovals from "@/add-os/lang/en/hr-approvals.json"
import enBenefits from "@/add-os/lang/en/hr-benefits.json"
import enPayroll from "@/add-os/lang/en/hr-payroll.json"
import enHr from "@/add-os/lang/en/hr.json"
import { ApiError } from "@/add-os/services/api"
import AssignmentModal from "../AssignmentModal.vue"
import BenefitModal from "../BenefitModal.vue"
import GrantsTable from "../GrantsTable.vue"

const mocks = vi.hoisted(() => ({
	create: vi.fn(),
	update: vi.fn(),
	assign: vi.fn(),
	retry: vi.fn(),
	cancel: vi.fn(),
	success: vi.fn(),
	warning: vi.fn(),
	error: vi.fn(),
	dialog: vi.fn((options: { onPositiveClick: () => unknown }) => options.onPositiveClick())
}))

vi.mock("@/add-os/config/permissions", () => ({ canViewEmployees: () => false }))
vi.mock("@/add-os/services/hr/benefits", () => ({
	createBenefit: mocks.create,
	updateBenefit: mocks.update,
	assignBenefit: mocks.assign,
	retryGrant: mocks.retry,
	cancelGrant: mocks.cancel
}))
vi.mock("@/add-os/services/hr/payroll", () => ({ listCurrencyOptions: vi.fn().mockResolvedValue([]) }))
vi.mock("@/add-os/services/hr/core", () => ({ listJobGrades: vi.fn().mockResolvedValue([]), listOrgUnits: vi.fn().mockResolvedValue([]), listEmployees: vi.fn(), getEmployee: vi.fn() }))
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: mocks.success, warning: mocks.warning, error: mocks.error }), useDialog: () => ({ warning: mocks.dialog }) }
})

const i18n = createI18n({ legacy: false, locale: "en", messages: { en: { ...en, ...enHr, ...enApprovals, ...enPayroll, ...enBenefits } } })

function benefit(overrides: Partial<Benefit> = {}): Benefit {
	return {
		id: 1,
		code: "cafe-pts",
		name: { ar: "نقاط المقهى", en: "Café points" },
		description: null,
		kind: "in_kind_credit",
		frequency: "monthly",
		grant_month: null,
		amount: "200",
		currency: null,
		unit: "points",
		employer_cost: "20.00",
		cost_currency: "USD",
		pay_component_id: null,
		fulfillment: { category: "cafe", expires_after_days: 30 },
		eligible_after_days: 90,
		is_active: true,
		...overrides
	}
}

const allowance: PayComponent = {
	id: 5,
	code: "allowance",
	name: { ar: "بدل", en: "Allowance" },
	kind: "earning",
	calculator: "benefit_allowance",
	config: null,
	applies_to_all: true,
	taxable: true,
	insurable: false,
	sort: 50,
	is_active: true
}

/** Mounts a dialog closed, then opens it, as a page does. */
async function open(target: typeof BenefitModal | typeof AssignmentModal, props: Record<string, unknown>) {
	const wrapper = mount(target as never, { props: { show: false, ...props }, global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body } as never) as ReturnType<typeof mount>
	await wrapper.setProps({ show: true })
	await flushPromises()
	return wrapper
}

describe("benefit forms", () => {
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

	describe("benefit", () => {
		interface Vm {
			form: Record<string, unknown>
			payload: () => Record<string, unknown>
			allowanceOptions: { value: number }[]
		}

		it("sends points, a pocket and a cost for a new in-kind benefit, and no currency or pay component", async () => {
			const wrapper = await open(BenefitModal, { benefit: null, payComponents: [allowance] })
			const vm = wrapper.vm as unknown as Vm
			Object.assign(vm.form, { nameAr: "نقاط المقهى", code: "cafe-pts", kind: "in_kind_credit", amount: 200, category: "cafe", expiresAfterDays: 30, employerCost: 20, costCurrency: "USD" })

			expect(vm.payload()).toEqual({
				name: { ar: "نقاط المقهى", en: null },
				description: null,
				amount: 200,
				eligible_after_days: 0,
				is_active: true,
				employer_cost: 20,
				cost_currency: "USD",
				fulfillment: { category: "cafe", expires_after_days: 30 },
				code: "cafe-pts",
				kind: "in_kind_credit",
				frequency: "monthly",
				unit: "points"
			})
			wrapper.unmount()
		})

		it("sends a currency and pay component for a cash allowance, and never an employer cost", async () => {
			const wrapper = await open(BenefitModal, { benefit: null, payComponents: [allowance, { ...allowance, id: 6, applies_to_all: false }] })
			const vm = wrapper.vm as unknown as Vm
			Object.assign(vm.form, { nameAr: "بدل نقل", code: "transport", kind: "cash_allowance", amount: 40, currency: "USD", payComponentId: 5, employerCost: 10 })

			const payload = vm.payload()
			expect(payload).toMatchObject({ kind: "cash_allowance", currency: "USD", pay_component_id: 5 })
			expect(payload).not.toHaveProperty("employer_cost")
			expect(payload).not.toHaveProperty("unit")
			expect(vm.allowanceOptions.map(o => o.value)).toEqual([5])
			wrapper.unmount()
		})

		it("leaves the fixed fields and an empty description out of an update", async () => {
			mocks.update.mockResolvedValue({ message: "The benefit has been updated." })
			const wrapper = await open(BenefitModal, { benefit: benefit(), payComponents: [] })
			const vm = wrapper.vm as unknown as Vm

			const payload = vm.payload()
			expect(payload).not.toHaveProperty("code")
			expect(payload).not.toHaveProperty("kind")
			expect(payload).not.toHaveProperty("unit")
			expect(payload).not.toHaveProperty("description")
			expect(payload).toMatchObject({ amount: 200, fulfillment: { category: "cafe", expires_after_days: 30 }, eligible_after_days: 90 })
			wrapper.unmount()
		})
	})

	describe("assignment", () => {
		interface Vm {
			form: Record<string, unknown>
			ready: boolean
			save: () => Promise<void>
		}

		it("assigns to a grade with the benefit's own value", async () => {
			mocks.assign.mockResolvedValue({ id: 3 })
			const wrapper = await open(AssignmentModal, { benefit: benefit() })
			const vm = wrapper.vm as unknown as Vm
			Object.assign(vm.form, { target: "grade", gradeId: 2, from: "2026-11-01" })

			expect(vm.ready).toBe(true)
			await vm.save()

			expect(mocks.assign).toHaveBeenCalledWith(1, { job_grade_id: 2, amount: null, employer_cost: null, effective_from: "2026-11-01", effective_to: null })
			expect(mocks.success).toHaveBeenCalledWith("Benefit assigned.")
			wrapper.unmount()
		})

		it("takes a benefit away from one employee from their file, and shows the server's overlap refusal", async () => {
			mocks.assign.mockRejectedValue(new ApiError(422, JSON.stringify({ message: "This benefit is already assigned to the same target for part of that period." })))
			const wrapper = await open(AssignmentModal, { benefits: [benefit({ id: 4, kind: "cash_allowance", currency: "USD", unit: null })], employeeId: 7 })
			const vm = wrapper.vm as unknown as Vm
			Object.assign(vm.form, { benefitId: 4, excluded: true, amount: 30, from: "2026-11-01" })

			await vm.save()

			expect(mocks.assign).toHaveBeenCalledWith(4, { employee_id: 7, amount: null, excluded: true, effective_from: "2026-11-01", effective_to: null })
			expect(mocks.error).toHaveBeenCalledWith("This benefit is already assigned to the same target for part of that period.")
			wrapper.unmount()
		})
	})

	describe("grants table", () => {
		const grant = (status: "pending" | "failed" | "fulfilled", kind: "in_kind_credit" | "cash_allowance" = "in_kind_credit") => ({
			id: status === "failed" ? 2 : 1,
			benefit: { id: 1, code: "cafe-pts", name: { ar: "نقاط", en: "Points" }, kind },
			period: "2026-11",
			granted_on: "2026-11-01",
			amount: "200",
			currency: null,
			unit: "points",
			employer_cost: null,
			cost_currency: null,
			status,
			reference: null,
			failure: status === "failed" ? "The employee has no wallet: their account is not registered as a member." : null,
			attempts: 1,
			fulfilled_at: null,
			payslip_id: null
		})

		it("offers retry and cancel only where the server allows them", async () => {
			const wrapper = mount(GrantsTable, {
				props: { grants: [grant("failed"), grant("pending", "cash_allowance"), { ...grant("fulfilled"), id: 3 }], mayManage: true },
				global: { plugins: [i18n], stubs: { Icon: true } },
				attachTo: document.body
			})
			await flushPromises()

			expect(document.querySelectorAll("[aria-label='Try again']")).toHaveLength(1)
			expect(document.querySelectorAll("[aria-label='Cancel grant']")).toHaveLength(2)
			wrapper.unmount()
		})

		it("reports a retry that fails again with the server's reason, and cancels after asking", async () => {
			mocks.retry.mockResolvedValue({ ...grant("failed"), attempts: 2 })
			mocks.cancel.mockResolvedValue({ message: "The grant has been cancelled." })
			const wrapper = mount(GrantsTable, { props: { grants: [grant("failed")], mayManage: true }, global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
			await flushPromises()

			;(document.querySelector("[aria-label='Try again']") as HTMLButtonElement).click()
			await flushPromises()
			expect(mocks.warning).toHaveBeenCalledWith("The employee has no wallet: their account is not registered as a member.")

			;(document.querySelector("[aria-label='Cancel grant']") as HTMLButtonElement).click()
			await flushPromises()
			expect(mocks.cancel).toHaveBeenCalledWith(2)
			expect(mocks.success).toHaveBeenCalledWith("The grant has been cancelled.")
			expect(wrapper.emitted("changed")).toHaveLength(2)
			wrapper.unmount()
		})
	})
})
