import { beforeEach, describe, expect, it, vi } from "vitest"
import * as leave from "../leave"

const { getMock, postMock, patchMock, delMock, uploadMock } = vi.hoisted(() => ({
	getMock: vi.fn(),
	postMock: vi.fn(),
	patchMock: vi.fn(),
	delMock: vi.fn(),
	uploadMock: vi.fn()
}))

vi.mock("../../api", () => ({ get: getMock, post: postMock, patch: patchMock, del: delMock, uploadFile: uploadMock }))

const BASE = "/api/v1/hr"
const page = { data: [], meta: { current_page: 1, last_page: 1, per_page: 25, total: 0 } }
const request = { leave_type_id: 1, starts_on: "2026-11-02", ends_on: "2026-11-02", half_day: "first_half" as const, hours: null, reason: "Clinic", attachment: null }

describe("hr leave service", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("reads and writes the settings resources", async () => {
		getMock.mockResolvedValue({ data: [] })
		postMock.mockResolvedValue({ data: { id: 1 } })
		patchMock.mockResolvedValue({ message: "ok" })
		delMock.mockResolvedValue(undefined)

		await leave.listLeaveTypes()
		await leave.listLeavePolicies(3)
		await leave.listHolidays(2026)
		await leave.listCoverageRules()
		await leave.updateCoverageRule(4, { min_present: 2, is_active: true })
		await expect(leave.deleteLeaveType(1)).resolves.toEqual({})

		expect(getMock).toHaveBeenNthCalledWith(1, `${BASE}/leave-types`)
		expect(getMock).toHaveBeenNthCalledWith(2, `${BASE}/leave-policies`, { leave_type_id: 3 })
		expect(getMock).toHaveBeenNthCalledWith(3, `${BASE}/holidays`, { year: 2026 })
		expect(getMock).toHaveBeenNthCalledWith(4, `${BASE}/coverage-rules`)
		expect(patchMock).toHaveBeenCalledWith(`${BASE}/coverage-rules/4`, { min_present: 2, is_active: true })
		expect(delMock).toHaveBeenCalledWith(`${BASE}/leave-types/1`)
	})

	it("lists requests with only the filters that are set", async () => {
		getMock.mockResolvedValue(page)

		await leave.listLeaveRequests({ page: 2, status: "approved", from: "2026-11-01", to: "2026-11-30", employee_id: null })

		expect(getMock).toHaveBeenCalledWith(`${BASE}/leave-requests`, { page: 2, status: "approved", from: "2026-11-01", to: "2026-11-30" })
	})

	it("reads the calendar for a range and a unit", async () => {
		getMock.mockResolvedValue({ data: [] })

		await leave.leaveCalendar("2026-11-01", "2026-11-30", 5)

		expect(getMock).toHaveBeenCalledWith(`${BASE}/leave-calendar`, { from: "2026-11-01", to: "2026-11-30", org_unit_id: 5 })
	})

	it("files a request as JSON without an attachment, as multipart with one", async () => {
		postMock.mockResolvedValue({ data: { id: 9 } })
		uploadMock.mockResolvedValue({ data: { id: 10 } })
		const file = new File(["x"], "note.pdf", { type: "application/pdf" })

		await leave.submitMyLeave(request)
		await leave.submitLeaveForEmployee(7, { ...request, attachment: file })

		expect(postMock).toHaveBeenCalledWith(`${BASE}/me/leave/requests`, { leave_type_id: 1, starts_on: "2026-11-02", ends_on: "2026-11-02", half_day: "first_half", hours: null, reason: "Clinic" })
		expect(uploadMock).toHaveBeenCalledWith(`${BASE}/employees/7/leave-requests`, file, "attachment", {
			leave_type_id: "1",
			starts_on: "2026-11-02",
			ends_on: "2026-11-02",
			half_day: "first_half",
			reason: "Clinic"
		})
	})

	it("quotes, cancels and adjusts on their own routes", async () => {
		postMock.mockResolvedValue({ data: { amount: "0.5", unit: "day", available: "10", remaining_after: "9.5" } })

		await expect(leave.quoteMyLeave({ leave_type_id: 1, starts_on: "2026-11-02", ends_on: "2026-11-02", half_day: "first_half", hours: null })).resolves.toEqual({
			amount: "0.5",
			unit: "day",
			available: "10",
			remaining_after: "9.5"
		})
		await leave.cancelMyLeave(3)
		await leave.cancelLeaveRequest(4)
		await leave.adjustLeaveBalance(7, { leave_type_id: 1, kind: "opening", amount: 12, effective_on: null, period_year: null, notes: "Migrated" })

		expect(postMock).toHaveBeenNthCalledWith(1, `${BASE}/me/leave/quote`, { leave_type_id: 1, starts_on: "2026-11-02", ends_on: "2026-11-02", half_day: "first_half", hours: null })
		expect(postMock).toHaveBeenNthCalledWith(2, `${BASE}/me/leave/requests/3/cancel`)
		expect(postMock).toHaveBeenNthCalledWith(3, `${BASE}/leave-requests/4/cancel`)
		expect(postMock).toHaveBeenNthCalledWith(4, `${BASE}/employees/7/leave-adjustments`, { leave_type_id: 1, kind: "opening", amount: 12, effective_on: null, period_year: null, notes: "Migrated" })
	})

	it("reads balances, ledgers and the team's leave", async () => {
		getMock.mockResolvedValueOnce({ data: [{ tracks_balance: true }] }).mockResolvedValue(page)

		await expect(leave.employeeLeaveBalances(7)).resolves.toEqual([{ tracks_balance: true }])
		await leave.employeeLeaveLedger(7, { page: 2, leave_type_id: 1, year: 2026 })
		await leave.myLeaveLedger({ page: 1, leave_type_id: null })
		getMock.mockResolvedValueOnce({ data: [] })
		await leave.myTeamLeave("2026-11-01", "2026-11-30")

		expect(getMock).toHaveBeenNthCalledWith(2, `${BASE}/employees/7/leave-ledger`, { page: 2, leave_type_id: 1, year: 2026 })
		expect(getMock).toHaveBeenNthCalledWith(3, `${BASE}/me/leave/ledger`, { page: 1 })
		expect(getMock).toHaveBeenNthCalledWith(4, `${BASE}/me/team/leave`, { from: "2026-11-01", to: "2026-11-30" })
	})
})
