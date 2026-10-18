import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import { addDays, isoWeekday, orgClock, orgDate } from "../time"

describe("hr time helpers", () => {
	beforeAll(() => {
		setCurrentLocale("en")
	})

	afterAll(() => {
		setCurrentLocale("ar")
	})

	it("reads the organisation's wall clock from the string, whatever the browser's zone", () => {
		expect(orgClock("2026-03-02T08:05:00+03:00")).toBe("08:05 AM")
		expect(orgClock("2026-03-02T16:30:00+03:00")).toBe("04:30 PM")
		expect(orgDate("2026-03-02T23:50:00+03:00")).toBe("2026-03-02")
	})

	it("moves dates by whole days across months and years", () => {
		expect(addDays("2026-02-27", 2)).toBe("2026-03-01")
		expect(addDays("2026-01-01", -1)).toBe("2025-12-31")
	})

	it("numbers weekdays as WorkPattern does: Monday 1 … Sunday 7", () => {
		expect(isoWeekday("2026-03-02")).toBe(1)
		expect(isoWeekday("2026-03-08")).toBe(7)
	})
})
