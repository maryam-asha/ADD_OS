import { beforeEach, describe, expect, it, vi } from "vitest"
import * as time from "../time"

const { getMock, postMock, putMock, patchMock, delMock } = vi.hoisted(() => ({
	getMock: vi.fn(),
	postMock: vi.fn(),
	putMock: vi.fn(),
	patchMock: vi.fn(),
	delMock: vi.fn()
}))

vi.mock("../../api", () => ({ get: getMock, post: postMock, put: putMock, patch: patchMock, del: delMock }))

const BASE = "/api/v1/hr"
const page = { data: [], meta: { current_page: 1, last_page: 1, per_page: 100, total: 0 } }

describe("hr time service", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("reads and writes shifts, patterns and policies", async () => {
		getMock.mockResolvedValue({ data: [] })
		postMock.mockResolvedValue({ data: { id: 1 } })
		patchMock.mockResolvedValue({ message: "ok" })
		delMock.mockResolvedValue(undefined)
		const pattern = { code: "sun-thu", name: { ar: "الأحد-الخميس", en: null }, kind: "fixed" as const, weekly: { 7: 1, 1: 1 }, weekly_hours: null, is_active: true }

		await time.listShiftTemplates()
		await time.createWorkPattern(pattern)
		await time.updateShiftTemplate(2, { break_minutes: 45 })
		await expect(time.deleteWorkPattern(3)).resolves.toEqual({})

		expect(getMock).toHaveBeenCalledWith(`${BASE}/shift-templates`)
		expect(postMock).toHaveBeenCalledWith(`${BASE}/work-patterns`, pattern)
		expect(patchMock).toHaveBeenCalledWith(`${BASE}/shift-templates/2`, { break_minutes: 45 })
		expect(delMock).toHaveBeenCalledWith(`${BASE}/work-patterns/3`)
	})

	it("reads the roster for a range and a unit, and saves and copies it", async () => {
		getMock.mockResolvedValue({ data: [] })
		putMock.mockResolvedValue({ message: "ok" })
		postMock.mockResolvedValue({ message: "3 roster days copied." })
		const entries = [{ employee_id: 1, work_date: "2026-03-06", shift_template_id: 1 }, { employee_id: 2, work_date: "2026-03-03", remove: true }]

		await time.getRoster({ from: "2026-03-01", to: "2026-03-07", org_unit_id: 1 })
		await time.saveRoster(entries)
		await time.copyRosterWeek({ from: "2026-03-01", to: "2026-03-08", org_unit_id: 1 })

		expect(getMock).toHaveBeenCalledWith(`${BASE}/roster`, { from: "2026-03-01", to: "2026-03-07", org_unit_id: 1 })
		expect(putMock).toHaveBeenCalledWith(`${BASE}/roster`, { entries })
		expect(postMock).toHaveBeenCalledWith(`${BASE}/roster/copy-week`, { from: "2026-03-01", to: "2026-03-08", org_unit_id: 1 })
	})

	it("sends only the filters that are set to the attendance lists", async () => {
		getMock.mockResolvedValue(page)

		await time.listAttendanceDays({ from: "2026-03-01", to: "2026-03-31", status: "no_record", employee_id: null, page: 2 })
		await time.listAttendanceExceptions({ from: "2026-03-01", to: "2026-03-31", status: "open", type: "late" })

		expect(getMock).toHaveBeenNthCalledWith(1, `${BASE}/attendance-days`, { from: "2026-03-01", to: "2026-03-31", status: "no_record", page: 2 })
		expect(getMock).toHaveBeenNthCalledWith(2, `${BASE}/attendance-exceptions`, { from: "2026-03-01", to: "2026-03-31", status: "open", type: "late" })
	})

	it("resolves, reprocesses, punches, and locks on their own routes", async () => {
		postMock.mockResolvedValue({ message: "ok" })

		await time.resolveAttendanceException(4, "excused", "Remote day")
		await time.reprocessAttendance({ from: "2026-03-01", to: "2026-03-31" })
		postMock.mockResolvedValueOnce({ data: { id: 9 } })
		await time.addManualPunch(7, "2026-03-02 16:00", "Reader was down")
		await time.lockTimePeriod(2026, 3)
		await time.unlockTimePeriod(2026, 3)

		expect(postMock).toHaveBeenNthCalledWith(1, `${BASE}/attendance-exceptions/4/resolve`, { resolution: "excused", note: "Remote day" })
		expect(postMock).toHaveBeenNthCalledWith(2, `${BASE}/attendance/reprocess`, { from: "2026-03-01", to: "2026-03-31" })
		expect(postMock).toHaveBeenNthCalledWith(3, `${BASE}/employees/7/attendance-punches`, { punched_at: "2026-03-02 16:00", reason: "Reader was down" })
		expect(postMock).toHaveBeenNthCalledWith(4, `${BASE}/time-periods/2026/3/lock`)
		expect(postMock).toHaveBeenNthCalledWith(5, `${BASE}/time-periods/2026/3/unlock`)
	})

	it("issues a card and answers its value, once", async () => {
		postMock.mockResolvedValue({ data: { qr_value: "card-value-abc" } })
		getMock.mockResolvedValue({ data: { has_card: true, issued_at: null } })
		delMock.mockResolvedValue(undefined)

		await expect(time.issueAttendanceCard(7)).resolves.toBe("card-value-abc")
		await expect(time.getAttendanceCard(7)).resolves.toEqual({ has_card: true, issued_at: null })
		await time.revokeAttendanceCard(7)

		expect(postMock).toHaveBeenCalledWith(`${BASE}/employees/7/attendance-card`)
		expect(delMock).toHaveBeenCalledWith(`${BASE}/employees/7/attendance-card`)
	})

	it("serves my own time on hr/me", async () => {
		getMock.mockResolvedValue({ data: [] })
		postMock.mockResolvedValue({ data: { id: 1 } })

		await time.mySchedule("2026-03-01", "2026-03-14")
		await time.myTeamAttendance(null)
		await time.submitAttendanceEntry({ work_date: "2026-03-02", check_in: "08:05", check_out: null, note: null })
		await time.submitOvertime({ work_date: "2026-03-02", minutes: 60, reason: "Launch" })

		expect(getMock).toHaveBeenNthCalledWith(1, `${BASE}/me/schedule`, { from: "2026-03-01", to: "2026-03-14" })
		expect(getMock).toHaveBeenNthCalledWith(2, `${BASE}/me/team/attendance`, undefined)
		expect(postMock).toHaveBeenNthCalledWith(1, `${BASE}/me/attendance/entries`, { work_date: "2026-03-02", check_in: "08:05", check_out: null, note: null })
		expect(postMock).toHaveBeenNthCalledWith(2, `${BASE}/me/overtime`, { work_date: "2026-03-02", minutes: 60, reason: "Launch" })
	})
})
