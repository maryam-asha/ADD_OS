import type { HrDashboard } from "@/add-os/modules/hr/types/reports"
import { flushPromises, mount } from "@vue/test-utils"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { reactive } from "vue"
import { createI18n } from "vue-i18n"
import { createMemoryHistory, createRouter } from "vue-router"

import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import en from "@/add-os/lang/en/en.json"
import enApprovals from "@/add-os/lang/en/hr-approvals.json"
import enAttendance from "@/add-os/lang/en/hr-attendance.json"
import enPayroll from "@/add-os/lang/en/hr-payroll.json"
import enPerformance from "@/add-os/lang/en/hr-performance.json"
import enReports from "@/add-os/lang/en/hr-reports.json"
import enTimesheets from "@/add-os/lang/en/hr-timesheets.json"
import enHr from "@/add-os/lang/en/hr.json"
import { ApiError } from "@/add-os/services/api"
import HeadcountReportPage from "../HeadcountReportPage.vue"
import HrDashboardPage from "../HrDashboardPage.vue"
import LiabilitiesReportPage from "../LiabilitiesReportPage.vue"

const mocks = vi.hoisted(() => ({
	dashboard: vi.fn(),
	headcount: vi.fn(),
	liabilities: vi.fn(),
	downloadLiabilities: vi.fn(),
	error: vi.fn(),
	permissions: { employees: false, alerts: true },
	query: {} as Record<string, string>
}))

vi.mock("@/add-os/config/permissions", () => ({
	canViewEmployees: () => mocks.permissions.employees,
	canViewHrAlerts: () => mocks.permissions.alerts,
	canManageApprovals: () => false,
	canViewLeave: () => true,
	canViewAttendance: () => true,
	canViewTimesheets: () => true,
	canViewRecruitment: () => false,
	canViewPerformance: () => true,
	canViewTraining: () => true
}))
vi.mock("@/add-os/services/hr/reports", () => ({
	getDashboard: mocks.dashboard,
	getHeadcount: mocks.headcount,
	downloadHeadcount: vi.fn(),
	getLiabilities: mocks.liabilities,
	downloadLiabilities: mocks.downloadLiabilities
}))
vi.mock("@/add-os/services/hr/recruitment", () => ({ listStages: vi.fn().mockResolvedValue([]) }))
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: vi.fn(), error: mocks.error }) }
})
vi.mock("vue-router", async () => {
	const actual = await vi.importActual<typeof import("vue-router")>("vue-router")
	return { ...actual, useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), useRoute: () => reactive({ query: mocks.query }) }
})

const i18n = createI18n({
	legacy: false,
	locale: "en",
	messages: { en: { ...en, ...enHr, ...enApprovals, ...enAttendance, ...enTimesheets, ...enPayroll, ...enPerformance, ...enReports } }
})
const router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/:any(.*)*", component: { render: () => null } }] })
const global = { plugins: [i18n, router], stubs: { Icon: true, apexchart: true } }
const text = () => document.body.textContent ?? ""

function dashboard(overrides: Partial<HrDashboard> = {}): HrDashboard {
	return {
		as_of: "2026-10-21",
		headcount: { employed: 42, by_status: { active: 38, probation: 4 }, hires_this_month: 3, leavers_this_month: 1 },
		alerts: { total: 5, by_type: { document_expired: 2, probation_ending: 3 } },
		leave: { pending_requests: 2, on_leave_today: 1 },
		payroll: { latest_run: { id: 12, year: 2026, month: 9, status: "approved", currency: "USD", employees: 40, net_total: "48250.5" } },
		...overrides
	}
}

describe("hR report pages", () => {
	beforeAll(() => {
		setCurrentLocale("en")
		vi.useFakeTimers({ toFake: ["Date"] })
		vi.setSystemTime(new Date(2026, 9, 21, 9, 0))
	})

	beforeEach(() => {
		vi.clearAllMocks()
		mocks.permissions.employees = false
		mocks.permissions.alerts = true
		for (const key of Object.keys(mocks.query)) delete mocks.query[key]
	})

	afterEach(() => {
		document.body.innerHTML = ""
	})

	afterAll(() => {
		vi.useRealTimers()
		setCurrentLocale("ar")
	})

	describe("the dashboard", () => {
		it("shows only the sections the server sent, and links a figure only where the list may be read", async () => {
			mocks.dashboard.mockResolvedValue(dashboard())
			const wrapper = mount(HrDashboardPage, { global, attachTo: document.body })
			await flushPromises()

			expect(text()).toContain("Workforce")
			expect(text()).toContain("Leave and time")
			expect(text()).toContain("Latest payroll run")
			expect(text()).not.toContain("Approvals")
			expect(text()).not.toContain("Hiring")
			expect(text()).toContain("September 2026")

			const hrefs = [...document.querySelectorAll("a")].map(a => a.getAttribute("href"))
			expect(hrefs).toContain("/hr/alerts")
			expect(hrefs).toContain("/hr-pay/payroll-runs/12")
			expect(hrefs).not.toContain("/hr/employees")
			wrapper.unmount()
		})

		it("leaves payroll out when the server does, and reloads for another day", async () => {
			mocks.dashboard.mockResolvedValue(dashboard({ payroll: undefined }))
			const wrapper = mount(HrDashboardPage, { global, attachTo: document.body })
			await flushPromises()

			expect(text()).not.toContain("Latest payroll run")
			expect(mocks.dashboard).toHaveBeenCalledWith(null)
			;(wrapper.vm as unknown as { asOf: string | null }).asOf = "2026-10-01"
			await flushPromises()
			expect(mocks.dashboard).toHaveBeenLastCalledWith("2026-10-01")
			wrapper.unmount()
		})
	})

	describe("headcount", () => {
		it("reads the last twelve months to start with", async () => {
			mocks.headcount.mockResolvedValue({ months: [], by_unit: [] })
			const wrapper = mount(HeadcountReportPage, { global, attachTo: document.body })
			await flushPromises()

			expect(mocks.headcount).toHaveBeenCalledWith("2025-11-01", "2026-10-31")
			wrapper.unmount()
		})

		it("refuses more than 36 months before asking, and cannot export it", async () => {
			mocks.query.from = "2023-01"
			mocks.query.to = "2026-10"
			const wrapper = mount(HeadcountReportPage, { global, attachTo: document.body })
			await flushPromises()

			expect(text()).toContain("Choose 36 months at most.")
			expect(mocks.headcount).not.toHaveBeenCalled()
			expect([...document.querySelectorAll("button")].find(b => b.textContent?.includes("Download CSV"))?.disabled).toBe(true)
			wrapper.unmount()
		})
	})

	describe("liabilities", () => {
		it("totals loans per currency, and shows the server's refusal of the CSV", async () => {
			mocks.liabilities.mockResolvedValue({
				as_of: "2026-10-21",
				leave: [{ employee: { id: 7, employee_number: "E-7", name: { ar: "سارة", en: "Sara" } }, leave_type: { id: 1, code: "ANNUAL", name: { ar: "سنوية", en: "Annual" } }, days: 12.5 }],
				loans: [
					{ employee: { id: 7, employee_number: "E-7", name: { ar: "سارة", en: "Sara" } }, currency: "USD", outstanding: "100.10", installments: 2 },
					{ employee: { id: 9, employee_number: "E-9", name: { ar: "رامي", en: "Rami" } }, currency: "USD", outstanding: "0.20", installments: 1 }
				]
			})
			mocks.downloadLiabilities.mockRejectedValue(new ApiError(403, JSON.stringify({ message: "This action is unauthorized." })))
			const wrapper = mount(LiabilitiesReportPage, { global, attachTo: document.body })
			await flushPromises()

			expect(text()).toContain("100.3")
			expect(text()).toContain("Annual")
			;[...document.querySelectorAll("button")].find(b => b.textContent?.includes("Download CSV"))?.click()
			await flushPromises()

			expect(mocks.downloadLiabilities).toHaveBeenCalledWith("2026-10-21")
			expect(mocks.error).toHaveBeenCalledWith("This action is unauthorized.")
			wrapper.unmount()
		})

		it("says loans are hidden when the server leaves them out", async () => {
			mocks.liabilities.mockResolvedValue({ as_of: "2026-10-21", leave: [], loans: null })
			const wrapper = mount(LiabilitiesReportPage, { global, attachTo: document.body })
			await flushPromises()

			expect(text()).toContain("Loans show only to those who may read pay.")
			expect(text()).not.toContain("Loan installments outstanding")
			wrapper.unmount()
		})
	})
})
