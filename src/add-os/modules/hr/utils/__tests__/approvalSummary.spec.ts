import type { ComposerTranslation } from "vue-i18n"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createI18n } from "vue-i18n"

import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import en from "@/add-os/lang/en/en.json"
import enApprovals from "@/add-os/lang/en/hr-approvals.json"
import enHr from "@/add-os/lang/en/hr.json"
import { requestTypeLabel, summaryHeadline, summaryRows } from "../approvalSummary"

const t = createI18n({ legacy: false, locale: "en", messages: { en: { ...en, ...enHr, ...enApprovals } } }).global.t as unknown as ComposerTranslation

describe("approval summaries", () => {
	beforeAll(() => {
		setCurrentLocale("en")
	})

	afterAll(() => {
		setCurrentLocale("ar")
	})

	it("reads a leave request the way LeaveApprovalHandler::summary() sends it", () => {
		const subject = {
			leave_request_id: 3,
			leave_type: { id: 1, code: "annual", name: { ar: "سنوية", en: "Annual" }, unit: "day" },
			starts_on: "2026-11-02",
			ends_on: "2026-11-05",
			half_day: null,
			amount: "4",
			reason: null,
			has_attachment: false
		}

		const rows = summaryRows(t, "leave", subject)

		expect(rows.find(r => r.label === "Leave type")?.value).toBe("Annual")
		expect(rows.find(r => r.label === "Amount")?.value).toBe("4 days")
		expect(rows.find(r => r.label === "Attachment")?.value).toBe("No")
		expect(summaryHeadline(t, "leave", subject)).toContain("Annual · ")
	})

	it("reads an overtime request's minutes as hours and minutes", () => {
		const rows = summaryRows(t, "overtime", { overtime_request_id: 1, work_date: "2026-11-02", minutes: 95, kind: "pre", reason: "launch" })

		expect(rows.find(r => r.label === "Duration")?.value).toBe("1 h 35 min")
		expect(rows.find(r => r.label === "Kind")?.value).toBe("Approved before")
	})

	it("still shows a type it does not know, key by key", () => {
		const rows = summaryRows(t, "something_new", { title: "X", nested: { a: 1 }, count: 2 })

		expect(rows).toEqual([
			{ label: "title", value: "X", ltr: true },
			{ label: "count", value: "2", ltr: true }
		])
		expect(requestTypeLabel(t, "something_new")).toBe("something_new")
		expect(requestTypeLabel(t, "loan")).toBe("Loan")
	})
})
