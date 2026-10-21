import type { ComposerTranslation } from "vue-i18n"
import { describe, expect, it } from "vitest"
import ar from "@/add-os/lang/ar"
import en from "@/add-os/lang/en"
import { headcountTotals, MAX_HEADCOUNT_MONTHS, monthsBack, monthsBetween, monthSpan, pagePath, percentLabel } from "../reports"

describe("report helpers", () => {
	it("turns a month range into its first and last day, leap years included", () => {
		expect(monthSpan("2025-11", "2026-02")).toEqual({ from: "2025-11-01", to: "2026-02-28" })
		expect(monthSpan("2028-02", "2028-02")).toEqual({ from: "2028-02-01", to: "2028-02-29" })
	})

	it("counts months both ends included, and goes back across a year", () => {
		expect(monthsBetween("2026-01", "2026-12")).toBe(12)
		expect(monthsBetween("2024-01", "2026-12")).toBe(MAX_HEADCOUNT_MONTHS)
		expect(monthsBetween("2024-01", "2027-01")).toBe(MAX_HEADCOUNT_MONTHS + 1)
		expect(monthsBack("2026-03", 11)).toBe("2025-04")
	})

	it("totals a range: its first opening, its last closing, and every hire and leaver", () => {
		const months = [
			{ month: "2026-09", opening: 40, hires: 3, leavers: 1, closing: 42, turnover_percent: "2.44" },
			{ month: "2026-10", opening: 42, hires: 2, leavers: 4, closing: 40, turnover_percent: "9.76" }
		]
		expect(headcountTotals(months)).toEqual({ opening: 40, closing: 40, hires: 5, leavers: 5 })
		expect(headcountTotals([])).toEqual({ opening: 0, closing: 0, hires: 0, leavers: 0 })
	})

	it("shows turnover to one decimal through the shared percent message", () => {
		const t = ((key: string, values: { value: string }) => `${key}:${values.value}`) as unknown as ComposerTranslation
		expect(percentLabel(t, "9.76")).toBe("dashboard.percent:9.8")
		expect(percentLabel(t, "0")).toBe("dashboard.percent:0")
	})

	it("finds a page's path by its keys and fills its id", () => {
		expect(pagePath("hrPay", "hrPayrollRun", 12)).toBe("/hr-pay/payroll-runs/12")
		expect(pagePath("hr", "hrAlerts")).toBe("/hr/alerts")
		expect(pagePath("hr", "nowhere")).toBeUndefined()
	})

	it("is merged into both languages' bundles", () => {
		expect((ar as { hrReports?: { csv?: string } }).hrReports?.csv).toBe("تنزيل CSV")
		expect((en as { hrReports?: { csv?: string } }).hrReports?.csv).toBe("Download CSV")
	})
})
