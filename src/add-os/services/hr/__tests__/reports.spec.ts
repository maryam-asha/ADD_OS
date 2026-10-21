import { beforeEach, describe, expect, it, vi } from "vitest"
import * as hr from "../reports"

const { getMock, downloadMock } = vi.hoisted(() => ({ getMock: vi.fn(), downloadMock: vi.fn() }))

vi.mock("../../api", () => ({ get: getMock, downloadFile: downloadMock }))

const BASE = "/api/v1/hr/reports"

describe("hr reports service", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		getMock.mockResolvedValue({ data: {} })
		downloadMock.mockResolvedValue(undefined)
	})

	it("reads each report with its own parameters", async () => {
		await hr.getDashboard()
		await hr.getDashboard("2026-10-01")
		await hr.getHeadcount("2025-11-01", "2026-10-31")
		await hr.getExceptionsReport("2026-10-01", "2026-10-21")
		await hr.getTimesheetCompliance("2026-10-17")
		await hr.getLiabilities(null)

		expect(getMock.mock.calls).toEqual([
			[`${BASE}/dashboard`, undefined],
			[`${BASE}/dashboard`, { as_of: "2026-10-01" }],
			[`${BASE}/headcount`, { from: "2025-11-01", to: "2026-10-31" }],
			[`${BASE}/attendance-exceptions`, { from: "2026-10-01", to: "2026-10-21" }],
			[`${BASE}/timesheet-compliance`, { week_start: "2026-10-17" }],
			[`${BASE}/liabilities`, undefined]
		])
	})

	it("asks the server for each CSV, named for its range", async () => {
		await hr.downloadHeadcount("2025-11-01", "2026-10-31")
		await hr.downloadExceptionsReport("2026-10-01", "2026-10-21")
		await hr.downloadTimesheetCompliance("2026-10-17")
		await hr.downloadLiabilities("2026-10-21")

		expect(downloadMock.mock.calls).toEqual([
			[`${BASE}/headcount`, { from: "2025-11-01", to: "2026-10-31", format: "csv" }, "headcount-2025-11-01-2026-10-31.csv"],
			[`${BASE}/attendance-exceptions`, { from: "2026-10-01", to: "2026-10-21", format: "csv" }, "attendance-exceptions-2026-10-01-2026-10-21.csv"],
			[`${BASE}/timesheet-compliance`, { week_start: "2026-10-17", format: "csv" }, "timesheet-compliance-2026-10-17.csv"],
			[`${BASE}/liabilities`, { as_of: "2026-10-21", format: "csv" }, "liabilities-2026-10-21.csv"]
		])
	})
})
