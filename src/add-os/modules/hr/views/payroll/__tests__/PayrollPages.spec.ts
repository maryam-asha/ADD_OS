import type { PayrollRun } from "@/add-os/modules/hr/types/payroll"
import { flushPromises, mount } from "@vue/test-utils"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import en from "@/add-os/lang/en/en.json"
import enApprovals from "@/add-os/lang/en/hr-approvals.json"
import enPayroll from "@/add-os/lang/en/hr-payroll.json"
import enTimesheets from "@/add-os/lang/en/hr-timesheets.json"
import enHr from "@/add-os/lang/en/hr.json"
import { ApiError } from "@/add-os/services/api"
import PayrollRunPage from "../PayrollRunPage.vue"
import PayslipPage from "../PayslipPage.vue"

const mocks = vi.hoisted(() => ({
	getRun: vi.fn(),
	payslips: vi.fn(),
	step: vi.fn(),
	cancel: vi.fn(),
	getPayslip: vi.fn(),
	getMyPayslip: vi.fn(),
	push: vi.fn(),
	success: vi.fn(),
	error: vi.fn(),
	dialog: vi.fn((options: { onPositiveClick: () => unknown }) => options.onPositiveClick()),
	permissions: { manage: true, approve: true, pay: true },
	route: { name: "hrPay.hrPayrollRun" as string, params: { id: "3" } as Record<string, string>, query: {} }
}))

vi.mock("@/add-os/config/permissions", () => ({
	canManagePayroll: () => mocks.permissions.manage,
	canApprovePayroll: () => mocks.permissions.approve,
	canPayPayroll: () => mocks.permissions.pay,
	canViewEmployees: () => false
}))
vi.mock("@/add-os/services/hr/payroll", () => ({
	getPayrollRun: mocks.getRun,
	listRunPayslips: mocks.payslips,
	runStep: mocks.step,
	cancelPayrollRun: mocks.cancel,
	payPayrollRun: vi.fn(),
	listPayComponents: vi.fn().mockResolvedValue([]),
	listAdjustments: vi.fn().mockResolvedValue([]),
	payrollVariance: vi.fn().mockResolvedValue({ previous_run_id: null, rows: [] }),
	payrollJournal: vi.fn().mockResolvedValue([]),
	removeAdjustment: vi.fn(),
	downloadPayrollJournal: vi.fn(),
	getPayslip: mocks.getPayslip,
	getMyPayslip: mocks.getMyPayslip,
	listCurrencyOptions: vi.fn().mockResolvedValue([])
}))
vi.mock("@/add-os/services/hr/core", () => ({ getEmployee: vi.fn() }))
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: mocks.success, error: mocks.error }), useDialog: () => ({ warning: mocks.dialog }) }
})
vi.mock("vue-router", async () => {
	const actual = await vi.importActual<typeof import("vue-router")>("vue-router")
	return { ...actual, useRouter: () => ({ push: mocks.push, replace: vi.fn(), back: vi.fn() }), useRoute: () => mocks.route }
})

const i18n = createI18n({ legacy: false, locale: "en", messages: { en: { ...en, ...enHr, ...enApprovals, ...enTimesheets, ...enPayroll } } })
const mountPage = (component: object) => mount(component, { global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })

function run(overrides: Partial<PayrollRun> = {}): PayrollRun {
	return {
		id: 3,
		year: 2026,
		month: 10,
		kind: "regular",
		currency: "USD",
		status: "open",
		employee_ids: null,
		exchange_rates: null,
		parallel_run: false,
		reconciled_at: null,
		notes: null,
		totals: { payslips: 2, gross: "3000.00", deductions: "300.00", net: "2700.00", employer_cost: "3200.00", warnings: 0 },
		calculated_at: null,
		calculated_by: null,
		reviewed_at: null,
		reviewed_by: null,
		approved_at: null,
		approved_by: null,
		paid_at: null,
		payment_reference: null,
		posted_at: null,
		...overrides
	}
}

const buttonLabels = () => [...document.querySelectorAll("button")].map(b => b.textContent?.trim()).filter(Boolean)
const click = (label: string) => [...document.querySelectorAll("button")].find(b => b.textContent?.trim() === label)?.click()

describe("payroll pages", () => {
	beforeAll(() => {
		setCurrentLocale("en")
	})

	beforeEach(() => {
		vi.clearAllMocks()
		Object.assign(mocks.permissions, { manage: true, approve: true, pay: true })
		mocks.route.name = "hrPay.hrPayrollRun"
		mocks.payslips.mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 100, total: 0 } })
		mocks.step.mockResolvedValue({ message: "The payroll has been calculated." })
	})

	afterEach(() => {
		document.body.innerHTML = ""
	})

	afterAll(() => {
		setCurrentLocale("ar")
	})

	describe("a payroll run", () => {
		it("offers calculating an open run, and nothing an account may not do", async () => {
			mocks.getRun.mockResolvedValue(run())
			const wrapper = mountPage(PayrollRunPage)
			await flushPromises()

			expect(buttonLabels()).toContain("Calculate")
			expect(buttonLabels()).not.toContain("Approve")
			expect(buttonLabels()).not.toContain("Mark paid")

			click("Calculate")
			await flushPromises()
			expect(mocks.step).toHaveBeenCalledWith(3, "calculate")
			expect(mocks.success).toHaveBeenCalledWith("The payroll has been calculated.")
			wrapper.unmount()
		})

		it("offers approval of a reviewed run only to an approver, and asks first", async () => {
			mocks.getRun.mockResolvedValue(run({ status: "reviewed", calculated_at: "2026-11-01T09:00:00+03:00" }))
			mocks.permissions.approve = false
			const first = mountPage(PayrollRunPage)
			await flushPromises()
			expect(buttonLabels()).not.toContain("Approve")
			first.unmount()
			document.body.innerHTML = ""

			mocks.permissions.approve = true
			const wrapper = mountPage(PayrollRunPage)
			await flushPromises()
			click("Approve")
			await flushPromises()

			expect(mocks.dialog).toHaveBeenCalledWith(expect.objectContaining({ title: "Approve" }))
			expect(mocks.step).toHaveBeenCalledWith(3, "approve")
			wrapper.unmount()
		})

		it("shows the server's separation-of-duties refusal as written", async () => {
			mocks.getRun.mockResolvedValue(run({ status: "reviewed" }))
			mocks.step.mockRejectedValue(new ApiError(403, JSON.stringify({ message: "The person who calculated a payroll cannot approve it." })))
			const wrapper = mountPage(PayrollRunPage)
			await flushPromises()

			click("Approve")
			await flushPromises()

			expect(mocks.error).toHaveBeenCalledWith("The person who calculated a payroll cannot approve it.")
			wrapper.unmount()
		})

		it("holds approval of a parallel run until it is confirmed to match", async () => {
			mocks.getRun.mockResolvedValue(run({ status: "reviewed", parallel_run: true }))
			const wrapper = mountPage(PayrollRunPage)
			await flushPromises()

			const approve = [...document.querySelectorAll("button")].find(b => b.textContent?.trim() === "Approve")
			expect(approve?.disabled).toBe(true)
			expect(buttonLabels()).toContain("Confirm match")
			expect(document.body.textContent).toContain("must be confirmed against the current one")
			wrapper.unmount()
		})

		it("treats an approved run as locked: no recalculating, no deleting, pay and post instead", async () => {
			mocks.getRun.mockResolvedValue(run({ status: "approved" }))
			const wrapper = mountPage(PayrollRunPage)
			await flushPromises()

			const labels = buttonLabels()
			expect(labels).not.toContain("Recalculate")
			expect(labels).toContain("Mark paid")
			expect(labels).toContain("Mark posted")
			expect(document.querySelector("[aria-label='Delete run']")).toBeNull()
			wrapper.unmount()
		})

		it("deletes an unapproved run after asking, then goes back to the list", async () => {
			mocks.getRun.mockResolvedValue(run({ status: "calculated" }))
			mocks.cancel.mockResolvedValue({})
			const wrapper = mountPage(PayrollRunPage)
			await flushPromises()

			;(document.querySelector("[aria-label='Delete run']") as HTMLButtonElement).click()
			await flushPromises()

			expect(mocks.cancel).toHaveBeenCalledWith(3)
			expect(mocks.push).toHaveBeenCalledWith({ name: "hrPay.hrPayrollRuns" })
			wrapper.unmount()
		})
	})

	describe("the payslip page", () => {
		const slip = {
			id: 8,
			payroll_run_id: 3,
			period: "2026-10",
			employee_id: 7,
			employee: { employee_number: "E-7", name: { ar: "سارة", en: "Sara" }, job_title: null, org_unit: null, hired_on: "2024-01-01", terminated_on: null },
			currency: "USD",
			gross: "1500.00",
			deductions: "150.00",
			net: "1350.00",
			employed_days: 31,
			days_in_month: 31,
			warnings: ["negative_net"],
			published_at: "2026-11-02T10:00:00+03:00",
			lines: [{ code: "basic", name: { ar: "الأساسي", en: "Basic" }, kind: "earning", basis: null, quantity: "31", rate: "1500", amount: "1500.00", original_amount: null, original_currency: null }]
		}

		it("reads the employee's own slip from hr/me and hides HR's warnings", async () => {
			mocks.route.name = "myHr.hrMyPayslip"
			mocks.route.params = { id: "8" }
			mocks.getMyPayslip.mockResolvedValue(slip)
			const wrapper = mountPage(PayslipPage)
			await flushPromises()

			expect(mocks.getMyPayslip).toHaveBeenCalledWith(8)
			expect(mocks.getPayslip).not.toHaveBeenCalled()
			expect(document.body.textContent).toContain("Basic")
			expect(document.body.textContent).toContain("October 2026")
			expect(document.body.textContent).not.toContain("the net is below zero")
			wrapper.unmount()
		})

		it("says a slip not issued to the employee does not exist", async () => {
			mocks.route.name = "myHr.hrMyPayslip"
			mocks.getMyPayslip.mockRejectedValue(new ApiError(404, JSON.stringify({ message: "Not found." })))
			const wrapper = mountPage(PayslipPage)
			await flushPromises()

			expect(document.body.textContent).toContain("This payslip does not exist or has not been issued.")
			wrapper.unmount()
		})

		it("shows HR the warnings of a slip", async () => {
			mocks.route.name = "hrPay.hrPayslip"
			mocks.getPayslip.mockResolvedValue({ ...slip, employer_cost: "1600.00" })
			const wrapper = mountPage(PayslipPage)
			await flushPromises()

			expect(document.body.textContent).toContain("the net is below zero")
			expect(document.body.textContent).toContain("Employer cost")
			wrapper.unmount()
		})
	})
})
