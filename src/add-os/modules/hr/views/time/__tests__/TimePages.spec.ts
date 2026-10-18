import { flushPromises, mount } from "@vue/test-utils"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick } from "vue"
import { createI18n } from "vue-i18n"

import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import en from "@/add-os/lang/en/en.json"
import enApprovals from "@/add-os/lang/en/hr-approvals.json"
import enAttendance from "@/add-os/lang/en/hr-attendance.json"
import enLeave from "@/add-os/lang/en/hr-leave.json"
import enHr from "@/add-os/lang/en/hr.json"
import { ApiError } from "@/add-os/services/api"
import AttendancePage from "../AttendancePage.vue"
import RosterPage from "../RosterPage.vue"
import TimePeriodsPage from "../TimePeriodsPage.vue"

const { rosterMock, saveRosterMock, daysMock, exceptionsMock, resolveMock, periodsMock, lockMock, errorMock, permissions, route } = vi.hoisted(() => ({
	rosterMock: vi.fn(),
	saveRosterMock: vi.fn(),
	daysMock: vi.fn(),
	exceptionsMock: vi.fn(),
	resolveMock: vi.fn(),
	periodsMock: vi.fn(),
	lockMock: vi.fn(),
	errorMock: vi.fn(),
	permissions: { roster: true, correct: true, lock: true },
	route: { query: {} as Record<string, string> }
}))

vi.mock("@/add-os/config/permissions", () => ({
	canManageRoster: () => permissions.roster,
	canCorrectAttendance: () => permissions.correct,
	canLockAttendance: () => permissions.lock,
	canViewEmployees: () => false
}))
vi.mock("@/add-os/services/hr/time", () => ({
	getRoster: rosterMock,
	saveRoster: saveRosterMock,
	copyRosterWeek: vi.fn(),
	listShiftTemplates: vi.fn().mockResolvedValue([
		{ id: 1, code: "morning", name: { ar: "صباحي", en: "Morning" }, starts_at: "08:00", ends_at: "16:00", crosses_midnight: false, break_minutes: 30, planned_minutes: 450, is_active: true }
	]),
	listAttendanceDays: daysMock,
	listAttendanceExceptions: exceptionsMock,
	resolveAttendanceException: resolveMock,
	reprocessAttendance: vi.fn(),
	listTimePeriods: periodsMock,
	lockTimePeriod: lockMock,
	unlockTimePeriod: vi.fn()
}))
vi.mock("@/add-os/services/hr/core", () => ({ listOrgUnits: vi.fn().mockResolvedValue([]), listEmployees: vi.fn() }))
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return {
		...actual,
		useMessage: () => ({ success: vi.fn(), error: errorMock }),
		useDialog: () => ({ warning: (options: { onPositiveClick: () => unknown }) => options.onPositiveClick() })
	}
})
vi.mock("vue-router", async () => {
	const actual = await vi.importActual<typeof import("vue-router")>("vue-router")
	return { ...actual, useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), useRoute: () => route }
})

const i18n = createI18n({ legacy: false, locale: "en", messages: { en: { ...en, ...enHr, ...enApprovals, ...enLeave, ...enAttendance } } })
const pageOf = (data: unknown[]) => ({ data, meta: { current_page: 1, last_page: 1, per_page: 100, total: data.length } })
const mountPage = (component: object) => mount(component, { global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })

describe("time pages", () => {
	beforeAll(() => {
		setCurrentLocale("en")
	})

	beforeEach(() => {
		vi.clearAllMocks()
		Object.assign(permissions, { roster: true, correct: true, lock: true })
		route.query = { start: "2026-03-01" }
		rosterMock.mockResolvedValue([
			{
				employee: { id: 7, employee_number: "E-0007", name: { ar: "ريم", en: "Reem" } },
				days: [
					{ date: "2026-03-01", kind: "shift", shift_template_id: 1, rostered: false },
					{ date: "2026-03-02", kind: "rest", shift_template_id: null, rostered: true }
				]
			}
		])
		saveRosterMock.mockResolvedValue({ message: "The roster has been saved." })
		daysMock.mockResolvedValue(pageOf([]))
		exceptionsMock.mockResolvedValue(
			pageOf([{ id: 4, attendance_day_id: 9, employee: { id: 7, name: { ar: "ريم", en: "Reem" } }, work_date: "2026-03-02", type: "no_record", status: "open", resolution: null, note: null, resolved_by: null, resolved_at: null }])
		)
		resolveMock.mockResolvedValue({ message: "The exception has been resolved." })
		periodsMock.mockResolvedValue([])
	})

	afterEach(() => {
		document.body.innerHTML = ""
	})

	afterAll(() => {
		setCurrentLocale("ar")
	})

	it("roster: saves a shift, a day off and a return to the pattern as the API takes them", async () => {
		const wrapper = mountPage(RosterPage)
		await flushPromises()
		expect(rosterMock).toHaveBeenCalledWith({ from: "2026-03-01", to: "2026-03-07", org_unit_id: null })

		interface RosterDay { date: string; kind: string; shift_template_id: number | null; rostered: boolean }
		const vm = wrapper.vm as unknown as { edit: (id: number, day: RosterDay, v: number | "off" | "pattern") => void; save: () => Promise<void>; changeCount: number }
		vm.edit(7, { date: "2026-03-01", kind: "shift", shift_template_id: 1, rostered: false }, "off")
		vm.edit(7, { date: "2026-03-02", kind: "rest", shift_template_id: null, rostered: true }, "pattern")
		expect(vm.changeCount).toBe(2)
		await vm.save()
		await flushPromises()

		expect(saveRosterMock).toHaveBeenCalledWith([
			{ employee_id: 7, work_date: "2026-03-01", shift_template_id: null },
			{ employee_id: 7, work_date: "2026-03-02", remove: true }
		])
		expect(rosterMock).toHaveBeenCalledTimes(2)
		wrapper.unmount()
	})

	it("roster: an edit back to the saved value is no change", async () => {
		const wrapper = mountPage(RosterPage)
		await flushPromises()

		const vm = wrapper.vm as unknown as { edit: (id: number, day: object, v: number | "off" | "pattern") => void; changeCount: number }
		const day = { date: "2026-03-01", kind: "shift", shift_template_id: 1, rostered: false }
		vm.edit(7, day, 1)
		vm.edit(7, day, "pattern")
		expect(vm.changeCount).toBe(0)
		wrapper.unmount()
	})

	it("roster: read-only without hr.roster.manage", async () => {
		permissions.roster = false
		const wrapper = mountPage(RosterPage)
		await flushPromises()

		expect(document.body.textContent).not.toContain("Copy week")
		expect(document.body.textContent).toContain("Rest day")
		wrapper.unmount()
	})

	it("attendance: sends the exception filters and resolves one, then reloads", async () => {
		route.query = { view: "exceptions", from: "2026-03-01", to: "2026-03-31" }
		const wrapper = mountPage(AttendancePage)
		await flushPromises()
		expect(exceptionsMock).toHaveBeenCalledWith({ from: "2026-03-01", to: "2026-03-31", org_unit_id: null, employee_id: null, status: null, page: 1, type: null })

		const vm = wrapper.vm as unknown as { filters: { type: string | null }; openResolve: (row: unknown) => void; resolution: string | null; resolve: () => Promise<void> }
		vm.filters.type = "no_record"
		await nextTick()
		await flushPromises()
		expect(exceptionsMock).toHaveBeenLastCalledWith(expect.objectContaining({ type: "no_record" }))

		vm.openResolve({ id: 4, type: "no_record", work_date: "2026-03-02", employee: { name: { ar: "ريم", en: "Reem" } } })
		vm.resolution = "excused"
		await vm.resolve()
		await flushPromises()
		expect(resolveMock).toHaveBeenCalledWith(4, "excused", null)
		expect(exceptionsMock).toHaveBeenCalledTimes(3)
		wrapper.unmount()
	})

	it("monthly lock: shows the server's reason when the month cannot be locked", async () => {
		lockMock.mockRejectedValue(new ApiError(422, JSON.stringify({ message: "2 attendance exceptions in this month still need a review." })))
		const wrapper = mountPage(TimePeriodsPage)
		await flushPromises()

		const vm = wrapper.vm as unknown as { month: string | null; confirmLock: () => void }
		vm.month = "2026-02"
		vm.confirmLock()
		await flushPromises()

		expect(lockMock).toHaveBeenCalledWith(2026, 2)
		expect(errorMock).toHaveBeenCalledWith("2 attendance exceptions in this month still need a review.")
		wrapper.unmount()
	})
})
