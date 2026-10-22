import type { GridRow } from "@/add-os/modules/hr/utils/timesheets"
import { flushPromises, mount } from "@vue/test-utils"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import en from "@/add-os/lang/en/en.json"
import enApprovals from "@/add-os/lang/en/hr-approvals.json"
import enAttendance from "@/add-os/lang/en/hr-attendance.json"
import enTimesheets from "@/add-os/lang/en/hr-timesheets.json"
import enHr from "@/add-os/lang/en/hr.json"
import { weekStartOf } from "@/add-os/modules/hr/utils/timesheets"
import { ApiError } from "@/add-os/services/api"
import MyTimesheetPage from "../MyTimesheetPage.vue"
import TimeByCostCenterPage from "../TimeByCostCenterPage.vue"
import TimesheetsPage from "../TimesheetsPage.vue"

const mocks = vi.hoisted(() => ({
	getMine: vi.fn(),
	save: vi.fn(),
	submit: vi.fn(),
	recall: vi.fn(),
	listMine: vi.fn(),
	list: vi.fn(),
	compliance: vi.fn(),
	report: vi.fn(),
	download: vi.fn(),
	success: vi.fn(),
	error: vi.fn(),
	dialog: vi.fn((options: { onPositiveClick: () => unknown }) => options.onPositiveClick()),
	route: { query: {} as Record<string, string> }
}))

vi.mock("@/add-os/config/permissions", () => ({ canViewEmployees: () => false }))
vi.mock("@/add-os/services/hr/timesheets", () => ({
	getMyTimesheet: mocks.getMine,
	saveMyTimesheet: mocks.save,
	submitMyTimesheet: mocks.submit,
	recallMyTimesheet: mocks.recall,
	listMyTimesheets: mocks.listMine,
	myCostCenters: vi.fn().mockResolvedValue([
		{ id: 1, code: "GRANT-A", name: { ar: "منحة أ", en: "Grant A" }, costable_type: null, costable_id: null, is_active: true },
		{ id: 2, code: "OPS", name: { ar: "العمليات", en: "Operations" }, costable_type: null, costable_id: null, is_active: true }
	]),
	listCostCenters: vi.fn().mockResolvedValue([]),
	listTimesheets: mocks.list,
	timesheetCompliance: mocks.compliance,
	getTimesheet: vi.fn(),
	timeByCostCenter: mocks.report,
	downloadTimeByCostCenter: mocks.download
}))
vi.mock("@/add-os/services/hr/core", () => ({ listOrgUnits: vi.fn().mockResolvedValue([]) }))
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: mocks.success, error: mocks.error }), useDialog: () => ({ warning: mocks.dialog }) }
})
vi.mock("vue-router", async () => {
	const actual = await vi.importActual<typeof import("vue-router")>("vue-router")
	return { ...actual, useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), useRoute: () => mocks.route }
})

const i18n = createI18n({ legacy: false, locale: "en", messages: { en: { ...en, ...enHr, ...enApprovals, ...enAttendance, ...enTimesheets } } })
const pageOf = (data: unknown[]) => ({ data, meta: { current_page: 1, last_page: 1, per_page: 25, total: data.length } })
const mountPage = (component: object) => mount(component, { global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
const reconciliation = { days: [], timesheet_hours: 0, attendance_hours: 0, difference_hours: 0 }

function week(status: string, entries: unknown[] = []) {
	return { timesheet: { id: status === "draft" && !entries.length ? null : 9, week_start: "2026-10-11", week_end: "2026-10-17", status, total_hours: "0", entries }, reconciliation }
}

interface MineVm {
	rows: GridRow[]
	dirty: boolean
	problem: string | null
	save: () => Promise<void>
	confirmSubmit: () => void
	confirmRecall: () => void
}

const buttons = (label: string) => [...document.querySelectorAll("button")].filter(b => b.textContent?.trim() === label)

describe("timesheet pages", () => {
	beforeAll(() => {
		setCurrentLocale("en")
	})

	beforeEach(() => {
		vi.clearAllMocks()
		mocks.route.query = { week: "2026-10-14" }
		mocks.listMine.mockResolvedValue(pageOf([]))
		mocks.save.mockResolvedValue({ message: "The timesheet has been saved." })
		mocks.submit.mockResolvedValue({ message: "The timesheet has been submitted for approval." })
		mocks.recall.mockResolvedValue({ message: "The timesheet is back in draft." })
	})

	afterEach(() => {
		document.body.innerHTML = ""
	})

	afterAll(() => {
		setCurrentLocale("ar")
	})

	describe("my timesheet", () => {
		it("opens the week the URL names on its Sunday, one line per cost center", async () => {
			mocks.getMine.mockResolvedValue(
				week("draft", [
					{ id: 1, cost_center_id: 1, work_date: "2026-10-12", hours: "7.50", note: null },
					{ id: 2, cost_center_id: 2, work_date: "2026-10-13", hours: "8.00", note: null }
				])
			)
			const wrapper = mountPage(MyTimesheetPage)
			await flushPromises()

			expect(mocks.getMine).toHaveBeenCalledWith("2026-10-11")
			const vm = wrapper.vm as unknown as MineVm
			expect(vm.rows.map(r => r.cost_center_id)).toEqual([1, 2])
			expect(vm.rows[0].hours["2026-10-12"]).toBe(7.5)
			expect(document.body.textContent).toContain("Grant A")
			wrapper.unmount()
		})

		it("saves the grid as the week's entries, then reloads it", async () => {
			mocks.getMine.mockResolvedValue(week("draft"))
			const wrapper = mountPage(MyTimesheetPage)
			await flushPromises()
			const vm = wrapper.vm as unknown as MineVm
			vm.rows[0].cost_center_id = 1
			vm.rows[0].hours["2026-10-12"] = 6
			vm.rows[0].hours["2026-10-13"] = 2.5
			vm.dirty = true
			mocks.getMine.mockClear()

			await vm.save()
			await flushPromises()

			expect(mocks.save).toHaveBeenCalledWith("2026-10-11", [
				{ cost_center_id: 1, work_date: "2026-10-12", hours: 6, note: null },
				{ cost_center_id: 1, work_date: "2026-10-13", hours: 2.5, note: null }
			])
			expect(mocks.success).toHaveBeenCalledWith("Timesheet saved.")
			expect(mocks.getMine).toHaveBeenCalledWith("2026-10-11")
			wrapper.unmount()
		})

		it("holds a save while hours are off the half-hour step or a line has no cost center", async () => {
			mocks.getMine.mockResolvedValue(week("draft"))
			const wrapper = mountPage(MyTimesheetPage)
			await flushPromises()
			const vm = wrapper.vm as unknown as MineVm

			vm.rows[0].hours["2026-10-12"] = 3
			await flushPromises()
			expect(vm.problem).toBe("Choose a cost center for every line with hours.")

			vm.rows[0].cost_center_id = 1
			vm.rows[0].hours["2026-10-12"] = 7.25
			await flushPromises()
			expect(vm.problem).toBe("Hours are entered in steps of 0.5.")
			wrapper.unmount()
		})

		it("saves a rejected week before submitting it again", async () => {
			mocks.getMine.mockResolvedValue(week("rejected", [{ id: 1, cost_center_id: 1, work_date: "2026-10-12", hours: "8.00", note: null }]))
			const wrapper = mountPage(MyTimesheetPage)
			await flushPromises()

			;(wrapper.vm as unknown as MineVm).confirmSubmit()
			await flushPromises()

			expect(mocks.save).toHaveBeenCalledWith("2026-10-11", [{ cost_center_id: 1, work_date: "2026-10-12", hours: 8, note: null }])
			expect(mocks.submit).toHaveBeenCalledWith("2026-10-11")
			expect(mocks.save.mock.invocationCallOrder[0]).toBeLessThan(mocks.submit.mock.invocationCallOrder[0])
			expect(mocks.success).toHaveBeenCalledWith("The timesheet has been submitted for approval.")
			wrapper.unmount()
		})

		it("does not submit when the save before it is refused", async () => {
			mocks.getMine.mockResolvedValue(week("rejected", [{ id: 1, cost_center_id: 1, work_date: "2026-10-12", hours: "8.00", note: null }]))
			mocks.save.mockRejectedValue(new ApiError(422, JSON.stringify({ message: "This month is locked." })))
			const wrapper = mountPage(MyTimesheetPage)
			await flushPromises()

			;(wrapper.vm as unknown as MineVm).confirmSubmit()
			await flushPromises()

			expect(mocks.error).toHaveBeenCalledWith("This month is locked.")
			expect(mocks.submit).not.toHaveBeenCalled()
			wrapper.unmount()
		})

		it("reads a submitted week only, and recalls it", async () => {
			mocks.getMine.mockResolvedValue(week("submitted", [{ id: 1, cost_center_id: 1, work_date: "2026-10-12", hours: "8.00", note: null }]))
			const wrapper = mountPage(MyTimesheetPage)
			await flushPromises()

			expect(buttons("Submit")).toHaveLength(0)
			expect(buttons("Save")).toHaveLength(0)
			expect(document.body.textContent).toContain("This week is awaiting approval.")

			;(wrapper.vm as unknown as MineVm).confirmRecall()
			await flushPromises()

			expect(mocks.recall).toHaveBeenCalledWith("2026-10-11")
			expect(mocks.success).toHaveBeenCalledWith("The timesheet is back in draft.")
			wrapper.unmount()
		})
	})

	describe("timesheets and compliance", () => {
		it("lists with the week, status and employee from the URL", async () => {
			mocks.route.query = { week: "2026-10-11", status: "submitted" }
			mocks.list.mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 50, total: 0 } })
			const wrapper = mountPage(TimesheetsPage)
			await flushPromises()

			expect(mocks.list).toHaveBeenCalledWith({ page: 1, week_start: "2026-10-11", status: "submitted", employee_id: null })
			expect(mocks.compliance).not.toHaveBeenCalled()
			wrapper.unmount()
		})

		it("reads compliance for this week when none is chosen", async () => {
			mocks.route.query = { view: "compliance" }
			mocks.compliance.mockResolvedValue({
				week_start: "2026-10-11",
				missing: [{ id: 7, employee_number: "E-7", name: { ar: "سارة", en: "Sara" }, status: null }]
			})
			const wrapper = mountPage(TimesheetsPage)
			await flushPromises()

			const today = new Date()
			const pad = (n: number) => String(n).padStart(2, "0")
			const thisWeek = weekStartOf(`${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`)
			expect(mocks.compliance).toHaveBeenCalledWith(thisWeek, null)
			expect(document.body.textContent).toContain("Sara")
			expect(document.body.textContent).toContain("Not started")
			expect(document.body.textContent).toContain("1 employee")
			wrapper.unmount()
		})
	})

	describe("time by cost center", () => {
		it("totals the rows by cost center and downloads the same filters as CSV", async () => {
			mocks.route.query = { from: "2026-10-01", to: "2026-10-31" }
			mocks.report.mockResolvedValue([
				{ cost_center: { id: 1, code: "GRANT-A", name: { ar: "منحة", en: "Grant A" } }, employee: { id: 7, employee_number: "E-7", name: { ar: "سارة", en: "Sara" } }, hours: "12.50" },
				{ cost_center: { id: 1, code: "GRANT-A", name: { ar: "منحة", en: "Grant A" } }, employee: { id: 8, employee_number: "E-8", name: { ar: "رامي", en: "Rami" } }, hours: "4.00" },
				{ cost_center: { id: 2, code: "OPS", name: { ar: "العمليات", en: "Operations" } }, employee: { id: 7, employee_number: "E-7", name: { ar: "سارة", en: "Sara" } }, hours: "3.50" }
			])
			const wrapper = mountPage(TimeByCostCenterPage)
			await flushPromises()

			expect(mocks.report).toHaveBeenCalledWith({ from: "2026-10-01", to: "2026-10-31", cost_center_id: null })
			const vm = wrapper.vm as unknown as { totals: { hours: number; employees: number }[]; totalHours: number; download: () => Promise<void> }
			expect(vm.totals.map(c => [c.hours, c.employees])).toEqual([
				[16.5, 2],
				[3.5, 1]
			])
			expect(vm.totalHours).toBe(20)

			await vm.download()
			expect(mocks.download).toHaveBeenCalledWith({ from: "2026-10-01", to: "2026-10-31", cost_center_id: null })
			wrapper.unmount()
		})

		it("asks for a shorter range instead of sending one the server refuses", async () => {
			mocks.route.query = { from: "2025-01-01", to: "2026-10-31" }
			const wrapper = mountPage(TimeByCostCenterPage)
			await flushPromises()

			expect(mocks.report).not.toHaveBeenCalled()
			expect(document.body.textContent).toContain("Choose a range of a year at most.")
			wrapper.unmount()
		})
	})
})
