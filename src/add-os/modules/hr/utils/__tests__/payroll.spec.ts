import type { ComposerTranslation } from "vue-i18n"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createI18n } from "vue-i18n"
import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import enPayroll from "@/add-os/lang/en/hr-payroll.json"
import { calculatorLabel, isLocked, linesByKind, periodLabel, runStepIndex, warningLabel } from "../payroll"

const t = createI18n({ legacy: false, locale: "en", messages: { en: enPayroll } }).global.t as unknown as ComposerTranslation

describe("payroll helpers", () => {
	beforeAll(() => {
		setCurrentLocale("en")
	})

	afterAll(() => {
		setCurrentLocale("ar")
	})

	it("places a run on its steps, with posting as the last mark", () => {
		expect(runStepIndex({ status: "open", posted_at: null })).toBe(0)
		expect(runStepIndex({ status: "approved", posted_at: null })).toBe(3)
		expect(runStepIndex({ status: "approved", posted_at: "2026-11-02T10:00:00+03:00" })).toBe(5)
	})

	it("locks approved and paid runs only", () => {
		expect(["open", "calculated", "reviewed", "approved", "paid"].map(s => isLocked(s as "open"))).toEqual([false, false, false, true, true])
	})

	it("names a period by month and year, and leaves an unreadable one as written", () => {
		expect(periodLabel("2026-10")).toBe("October 2026")
		expect(periodLabel("soon")).toBe("soon")
		expect(periodLabel(null)).toBe("")
	})

	it("names known calculators and keeps a server-added one by its key", () => {
		expect(calculatorLabel(t, "rate_table")).toBe("Legal rate table")
		expect(calculatorLabel(t, "donor_share")).toBe("donor_share")
	})

	it("reads payslip warnings, keeping an unknown one as written", () => {
		expect(warningLabel(t, "negative_net")).toBe("The deductions are larger than the pay: the net is below zero.")
		expect(warningLabel(t, "no_rate_in_force:SOCIAL")).toBe("No version of the rate table SOCIAL was in force.")
		expect(warningLabel(t, "something_new")).toBe("something_new")
	})

	it("groups slip lines in reading order and drops empty kinds", () => {
		const line = (code: string, kind: "earning" | "deduction" | "employer_contribution") => ({
			code,
			kind,
			name: { ar: code },
			basis: null,
			quantity: null,
			rate: null,
			amount: "1",
			original_amount: null,
			original_currency: null
		})
		const groups = linesByKind([line("tax", "deduction"), line("basic", "earning"), line("social_er", "employer_contribution")])

		expect(groups.map(g => g.kind)).toEqual(["earning", "deduction", "employer_contribution"])
	})
})
