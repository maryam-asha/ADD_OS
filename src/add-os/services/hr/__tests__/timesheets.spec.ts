import { beforeEach, describe, expect, it, vi } from "vitest"
import * as ts from "../timesheets"

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
const reconciliation = { days: [], timesheet_hours: 0, attendance_hours: 0, difference_hours: 0 }

describe("hr timesheets service", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe("cost centers", () => {
		it("lists, creates, updates and deletes", async () => {
			getMock.mockResolvedValue({ data: [{ id: 1, code: "GRANT-A" }] })
			postMock.mockResolvedValue({ data: { id: 2 } })
			patchMock.mockResolvedValue({ message: "The cost center has been updated." })
			delMock.mockResolvedValue(undefined)
			const payload = { code: "GRANT-B", name: { ar: "منحة", en: null }, is_active: true }

			await expect(ts.listCostCenters()).resolves.toEqual([{ id: 1, code: "GRANT-A" }])
			await expect(ts.createCostCenter(payload)).resolves.toEqual({ id: 2 })
			await expect(ts.updateCostCenter(2, { is_active: false })).resolves.toEqual({ message: "The cost center has been updated." })
			await expect(ts.deleteCostCenter(2)).resolves.toEqual({})

			expect(getMock).toHaveBeenCalledWith(`${BASE}/cost-centers`)
			expect(postMock).toHaveBeenCalledWith(`${BASE}/cost-centers`, payload)
			expect(patchMock).toHaveBeenCalledWith(`${BASE}/cost-centers/2`, { is_active: false })
			expect(delMock).toHaveBeenCalledWith(`${BASE}/cost-centers/2`)
		})
	})

	describe("cost split", () => {
		it("reads the history and replaces it from a date", async () => {
			getMock.mockResolvedValue({ data: [{ id: 5, percent: "60.00" }] })
			putMock.mockResolvedValue({ message: "The cost split has been updated." })
			const lines = [
				{ cost_center_id: 1, percent: 60 },
				{ cost_center_id: 2, percent: 40 }
			]

			await expect(ts.listCostAllocations(7)).resolves.toEqual([{ id: 5, percent: "60.00" }])
			await ts.replaceCostAllocations(7, "2026-11-01", lines)

			expect(getMock).toHaveBeenCalledWith(`${BASE}/employees/7/cost-allocations`)
			expect(putMock).toHaveBeenCalledWith(`${BASE}/employees/7/cost-allocations`, { effective_from: "2026-11-01", lines })
		})
	})

	describe("timesheets", () => {
		it("lists a page with only the filters that are set", async () => {
			getMock.mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 50, total: 0 } })

			await ts.listTimesheets({ week_start: "2026-10-12", status: null, employee_id: 7 })

			expect(getMock).toHaveBeenCalledWith(`${BASE}/timesheets`, { page: 1, week_start: "2026-10-12", employee_id: 7 })
		})

		it("reads a timesheet with its reconciliation beside data", async () => {
			getMock.mockResolvedValue({ data: { id: 3, status: "submitted" }, reconciliation })

			await expect(ts.getTimesheet(3)).resolves.toEqual({ timesheet: { id: 3, status: "submitted" }, reconciliation })
			expect(getMock).toHaveBeenCalledWith(`${BASE}/timesheets/3`)
		})

		it("asks compliance for a week, and a unit only when one is chosen", async () => {
			getMock.mockResolvedValue({ data: { week_start: "2026-10-12", missing: [] } })

			await ts.timesheetCompliance("2026-10-12")
			await ts.timesheetCompliance("2026-10-12", 4)

			expect(getMock).toHaveBeenNthCalledWith(1, `${BASE}/timesheets/compliance`, { week_start: "2026-10-12" })
			expect(getMock).toHaveBeenNthCalledWith(2, `${BASE}/timesheets/compliance`, { week_start: "2026-10-12", org_unit_id: 4 })
		})
	})

	describe("the time report", () => {
		it("reads rows and downloads the CSV with the same filters", async () => {
			getMock.mockResolvedValue({ data: [{ hours: "12.5" }] })
			downloadMock.mockResolvedValue(undefined)
			const filters = { from: "2026-10-01", to: "2026-10-31", cost_center_id: 2 }

			await expect(ts.timeByCostCenter(filters)).resolves.toEqual([{ hours: "12.5" }])
			await ts.downloadTimeByCostCenter({ ...filters, cost_center_id: null })

			expect(getMock).toHaveBeenCalledWith(`${BASE}/reports/time-by-cost-center`, filters)
			expect(downloadMock).toHaveBeenCalledWith(
				`${BASE}/reports/time-by-cost-center`,
				{ from: "2026-10-01", to: "2026-10-31", format: "csv" },
				"time-by-cost-center-2026-10-01-2026-10-31.csv"
			)
		})
	})

	describe("my timesheets", () => {
		it("reads a week by its first day, saves its entries, submits and recalls it", async () => {
			getMock.mockResolvedValue({ data: { id: null, status: "draft", entries: [] }, reconciliation })
			putMock.mockResolvedValue({ message: "The timesheet has been saved." })
			postMock.mockResolvedValue({ message: "ok" })
			const entries = [{ cost_center_id: 1, work_date: "2026-10-12", hours: 7.5, note: null }]

			await expect(ts.getMyTimesheet("2026-10-12")).resolves.toEqual({ timesheet: { id: null, status: "draft", entries: [] }, reconciliation })
			await ts.saveMyTimesheet("2026-10-12", entries)
			await ts.submitMyTimesheet("2026-10-12")
			await ts.recallMyTimesheet("2026-10-12")

			expect(getMock).toHaveBeenCalledWith(`${BASE}/me/timesheets/2026-10-12`)
			expect(putMock).toHaveBeenCalledWith(`${BASE}/me/timesheets/2026-10-12`, { entries })
			expect(postMock).toHaveBeenNthCalledWith(1, `${BASE}/me/timesheets/2026-10-12/submit`)
			expect(postMock).toHaveBeenNthCalledWith(2, `${BASE}/me/timesheets/2026-10-12/recall`)
		})

		it("reads my weeks by page and the centers I may log against", async () => {
			getMock.mockResolvedValueOnce({ data: [], meta: { current_page: 2, last_page: 2, per_page: 25, total: 26 } }).mockResolvedValueOnce({ data: [{ id: 1 }] })

			await ts.listMyTimesheets(2)
			await expect(ts.myCostCenters()).resolves.toEqual([{ id: 1 }])

			expect(getMock).toHaveBeenNthCalledWith(1, `${BASE}/me/timesheets`, { page: 2 })
			expect(getMock).toHaveBeenNthCalledWith(2, `${BASE}/me/cost-centers`)
		})
	})
})
