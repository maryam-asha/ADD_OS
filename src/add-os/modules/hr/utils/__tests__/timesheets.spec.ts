import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import { EMPTY } from "@/add-os/modules/hr/utils/translated"
import { centerName, dayTotal, emptyGridRow, entriesToGrid, gridToEntries, onIncrement, weekDays, weekStartOf } from "../timesheets"

const WEEK = weekDays("2026-10-11")

describe("timesheet weeks", () => {
	it("lands any day on the Sunday that starts its week, as ADD Core does", () => {
		expect(weekStartOf("2026-10-11")).toBe("2026-10-11")
		expect(weekStartOf("2026-10-15")).toBe("2026-10-11")
		expect(weekStartOf("2026-10-17")).toBe("2026-10-11")
		expect(weekStartOf("2026-10-18")).toBe("2026-10-18")
		expect(weekStartOf("2026-11-01")).toBe("2026-11-01")
		expect(weekStartOf("2026-10-31")).toBe("2026-10-25")
	})

	it("never lands on a Monday — the server refuses one as a week start", () => {
		expect(weekStartOf("2026-10-19")).toBe("2026-10-18")
	})

	it("lists the seven days across a month end", () => {
		expect(weekDays("2026-10-25")).toEqual(["2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31"])
		expect(weekDays("2026-11-29")).toEqual(["2026-11-29", "2026-11-30", "2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04", "2026-12-05"])
	})

	it("accepts hours only in half-hour steps", () => {
		expect(onIncrement(7.5)).toBe(true)
		expect(onIncrement(8)).toBe(true)
		expect(onIncrement(7.25)).toBe(false)
	})
})

describe("the weekly grid", () => {
	it("folds entries into one line per cost center, adding up a day logged twice", () => {
		const rows = entriesToGrid(
			[
				{ cost_center_id: 1, work_date: "2026-10-12", hours: "4.00", note: "Grant report" },
				{ cost_center_id: 1, work_date: "2026-10-12", hours: "1.50", note: null },
				{ cost_center_id: 2, work_date: "2026-10-13", hours: "8.00", note: null }
			],
			WEEK
		)

		expect(rows).toHaveLength(2)
		expect(rows[0].hours["2026-10-12"]).toBe(5.5)
		expect(rows[0].hours["2026-10-13"]).toBeNull()
		expect(dayTotal(rows, "2026-10-12")).toBe(5.5)
	})

	it("shows one note shared by every logged day as the line's note", () => {
		const [shared] = entriesToGrid(
			[
				{ cost_center_id: 1, work_date: "2026-10-12", hours: "4", note: "Audit" },
				{ cost_center_id: 1, work_date: "2026-10-13", hours: "4", note: "Audit" }
			],
			WEEK
		)
		const [mixed] = entriesToGrid(
			[
				{ cost_center_id: 1, work_date: "2026-10-12", hours: "4", note: "Audit" },
				{ cost_center_id: 1, work_date: "2026-10-13", hours: "4", note: "Visit" }
			],
			WEEK
		)

		expect(shared.note).toBe("Audit")
		expect(mixed.note).toBeNull()
	})

	it("keeps each entry's own note until the line's note is typed, then uses that for all", () => {
		const rows = entriesToGrid(
			[
				{ cost_center_id: 1, work_date: "2026-10-12", hours: "4", note: "Audit" },
				{ cost_center_id: 1, work_date: "2026-10-13", hours: "4", note: "Visit" }
			],
			WEEK
		)

		expect(gridToEntries(rows).map(e => e.note)).toEqual(["Audit", "Visit"])

		rows[0].note = " Field work "
		rows[0].noteEdited = true
		expect(gridToEntries(rows).map(e => e.note)).toEqual(["Field work", "Field work"])
	})

	it("drops empty cells and lines without a cost center", () => {
		const unassigned = emptyGridRow(WEEK)
		unassigned.hours["2026-10-12"] = 3
		const line = emptyGridRow(WEEK, 2)
		line.hours["2026-10-14"] = 6
		line.hours["2026-10-15"] = 0

		expect(gridToEntries([unassigned, line])).toEqual([{ cost_center_id: 2, work_date: "2026-10-14", hours: 6, note: null }])
	})
})

describe("cost center names", () => {
	beforeAll(() => {
		setCurrentLocale("en")
	})

	afterAll(() => {
		setCurrentLocale("ar")
	})

	it("reads code and name, either alone, or a dash", () => {
		expect(centerName({ code: "GRANT-A", name: { ar: "منحة", en: "Grant A" } })).toBe("GRANT-A · Grant A")
		expect(centerName({ code: "GRANT-A", name: null })).toBe("GRANT-A")
		expect(centerName({ code: null, name: null })).toBe(EMPTY)
	})
})
