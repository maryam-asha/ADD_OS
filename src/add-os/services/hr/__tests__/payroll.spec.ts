import { beforeEach, describe, expect, it, vi } from "vitest"
import * as pay from "../payroll"

const { getMock, postMock, putMock, patchMock, delMock, downloadMock } = vi.hoisted(() => ({
	getMock: vi.fn(),
	postMock: vi.fn(),
	putMock: vi.fn(),
	patchMock: vi.fn(),
	delMock: vi.fn(),
	downloadMock: vi.fn()
}))

vi.mock("../../api", () => ({ get: getMock, post: postMock, put: putMock, patch: patchMock, del: delMock, downloadFile: downloadMock }))

const BASE = "/api/v1/hr"
const page = { data: [], meta: { current_page: 1, last_page: 1, per_page: 25, total: 0 } }

describe("hr payroll service", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("reads the currencies from the public list once, and again after a failure", async () => {
		getMock.mockRejectedValueOnce(new Error("offline")).mockResolvedValue({ data: [{ code: "USD", name: "Dollar", symbol: "$" }] })

		await expect(pay.listCurrencyOptions()).rejects.toThrow("offline")
		await expect(pay.listCurrencyOptions()).resolves.toEqual([{ code: "USD", name: "Dollar", symbol: "$" }])
		await pay.listCurrencyOptions()

		expect(getMock).toHaveBeenCalledTimes(2)
		expect(getMock).toHaveBeenCalledWith("/api/v1/currencies")
	})

	describe("settings", () => {
		it("lists calculators and manages components", async () => {
			getMock.mockResolvedValueOnce({ data: ["fixed", "rate_table"] }).mockResolvedValueOnce({ data: [{ id: 1 }] })
			postMock.mockResolvedValue({ data: { id: 2 } })
			patchMock.mockResolvedValue({ message: "The pay component has been updated." })
			delMock.mockResolvedValue(undefined)
			const payload = {
				code: "basic",
				name: { ar: "الأساسي", en: "Basic" },
				kind: "earning" as const,
				calculator: "fixed",
				config: { prorate: true },
				applies_to_all: false,
				taxable: true,
				insurable: true,
				sort: 10,
				is_active: true
			}

			await expect(pay.listCalculators()).resolves.toEqual(["fixed", "rate_table"])
			await expect(pay.listPayComponents()).resolves.toEqual([{ id: 1 }])
			await pay.createPayComponent(payload)
			await pay.updatePayComponent(2, { is_active: false })
			await pay.deletePayComponent(2)

			expect(getMock).toHaveBeenNthCalledWith(1, `${BASE}/payroll-calculators`)
			expect(postMock).toHaveBeenCalledWith(`${BASE}/pay-components`, payload)
			expect(patchMock).toHaveBeenCalledWith(`${BASE}/pay-components/2`, { is_active: false })
			expect(delMock).toHaveBeenCalledWith(`${BASE}/pay-components/2`)
		})

		it("adds and closes rate table versions", async () => {
			postMock.mockResolvedValue({ data: { id: 4, versions: [] } })
			patchMock.mockResolvedValue({ message: "ok" })
			const version = { effective_from: "2026-01-01", effective_to: null, brackets: [{ up_to: 1000, rate: 0 }, { up_to: null, rate: 10 }], currency: "SYP", note: null }

			await pay.addRateVersion(4, version)
			await pay.closeRateVersion(9, "2026-12-31", "Replaced by the 2027 law")

			expect(postMock).toHaveBeenCalledWith(`${BASE}/rate-tables/4/versions`, version)
			expect(patchMock).toHaveBeenCalledWith(`${BASE}/rate-table-versions/9`, { effective_to: "2026-12-31", note: "Replaced by the 2027 law" })
		})
	})

	describe("pay and end of service", () => {
		it("changes the whole pay from a date with its reason", async () => {
			putMock.mockResolvedValue({ message: "The pay has been updated." })
			const lines = [{ pay_component_id: 1, amount: 1500, currency: "USD" }]

			await pay.changeCompensation(7, "2026-11-01", lines, "annual raise")

			expect(putMock).toHaveBeenCalledWith(`${BASE}/employees/7/compensation`, { effective_from: "2026-11-01", reason: "annual raise", lines })
		})

		it("reads an estimate and the liability as of a date, or today when none", async () => {
			getMock.mockResolvedValue({ data: { amount: "100" } })

			await pay.endOfServiceEstimate(7, "2026-12-31")
			await pay.endOfServiceLiability()

			expect(getMock).toHaveBeenNthCalledWith(1, `${BASE}/employees/7/end-of-service`, { as_of: "2026-12-31" })
			expect(getMock).toHaveBeenNthCalledWith(2, `${BASE}/reports/end-of-service-liability`, undefined)
		})
	})

	describe("runs", () => {
		it("lists with only the filters set and opens a run", async () => {
			getMock.mockResolvedValue(page)
			postMock.mockResolvedValue({ data: { id: 3 } })
			const open = { year: 2026, month: 10, kind: "regular" as const, currency: null, parallel_run: false, employee_ids: null, notes: null }

			await pay.listPayrollRuns({ year: 2026, status: null })
			await expect(pay.openPayrollRun(open)).resolves.toEqual({ id: 3 })

			expect(getMock).toHaveBeenCalledWith(`${BASE}/payroll-runs`, { page: 1, year: 2026 })
			expect(postMock).toHaveBeenCalledWith(`${BASE}/payroll-runs`, open)
		})

		it.each(["calculate", "review", "reconcile", "approve", "post"] as const)("takes the %s step", async step => {
			postMock.mockResolvedValue({ message: "ok" })

			await pay.runStep(3, step)

			expect(postMock).toHaveBeenCalledWith(`${BASE}/payroll-runs/3/${step}`)
		})

		it("pays with a reference, adjusts and removes an adjustment, and deletes a run", async () => {
			postMock.mockResolvedValue({ data: { id: 11 } })
			delMock.mockResolvedValue(undefined)
			const adjustment = { employee_id: 7, pay_component_id: 2, amount: -50, currency: "USD", note: "Overpaid last month" }

			await pay.payPayrollRun(3, "TRX-1")
			await expect(pay.addAdjustment(3, adjustment)).resolves.toEqual({ id: 11 })
			await pay.removeAdjustment(11)
			await pay.cancelPayrollRun(3)

			expect(postMock).toHaveBeenNthCalledWith(1, `${BASE}/payroll-runs/3/pay`, { payment_reference: "TRX-1" })
			expect(postMock).toHaveBeenNthCalledWith(2, `${BASE}/payroll-runs/3/adjustments`, adjustment)
			expect(delMock).toHaveBeenNthCalledWith(1, `${BASE}/payroll-adjustments/11`)
			expect(delMock).toHaveBeenNthCalledWith(2, `${BASE}/payroll-runs/3`)
		})

		it("downloads the journal as the server's CSV", async () => {
			await pay.downloadPayrollJournal({ id: 3, year: 2026, month: 4 })

			expect(downloadMock).toHaveBeenCalledWith(`${BASE}/payroll-runs/3/journal`, { format: "csv" }, "payroll-journal-2026-04-3.csv")
		})
	})

	describe("loans and my pay", () => {
		it("files, lists and settles loans", async () => {
			getMock.mockResolvedValue(page)
			postMock.mockResolvedValue({ data: { id: 5 } })
			const loan = { amount: 600, currency: "USD", installments: 6, first_month: "2026-12", reason: null }

			await pay.listLoans({ status: "active", employee_id: null })
			await pay.createLoan(7, loan)
			await pay.settleLoan(5, "Paid back in cash")

			expect(getMock).toHaveBeenCalledWith(`${BASE}/loans`, { page: 1, status: "active" })
			expect(postMock).toHaveBeenNthCalledWith(1, `${BASE}/employees/7/loans`, loan)
			expect(postMock).toHaveBeenNthCalledWith(2, `${BASE}/loans/5/settle`, { note: "Paid back in cash" })
		})

		it("reads my slips and loans, asks for and cancels a loan", async () => {
			getMock.mockResolvedValueOnce(page).mockResolvedValueOnce({ data: { id: 8 } }).mockResolvedValueOnce({ data: [] })
			postMock.mockResolvedValue({ data: { id: 5 } })

			await pay.listMyPayslips(2)
			await pay.getMyPayslip(8)
			await pay.listMyLoans()
			await pay.requestMyLoan({ amount: 300, currency: "USD", installments: 3, first_month: null, reason: "Rent" })
			await pay.cancelMyLoan(5)

			expect(getMock).toHaveBeenNthCalledWith(1, `${BASE}/me/payslips`, { page: 2 })
			expect(getMock).toHaveBeenNthCalledWith(2, `${BASE}/me/payslips/8`)
			expect(postMock).toHaveBeenNthCalledWith(2, `${BASE}/me/loans/5/cancel`)
		})
	})
})
