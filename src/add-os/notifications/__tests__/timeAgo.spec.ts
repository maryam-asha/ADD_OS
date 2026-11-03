import { describe, expect, it } from "vitest"

import { dayGroup, timeAgo } from "../timeAgo"

const NOW = new Date("2026-11-03T12:00:00Z").getTime()
const ago = (ms: number) => new Date(NOW - ms).toISOString()

describe("timeAgo", () => {
	it("reads under a minute, and a time slightly ahead, as now", () => {
		expect(timeAgo(ago(30_000), NOW)).toEqual({ unit: "now" })
		expect(timeAgo(ago(-5_000), NOW)).toEqual({ unit: "now" })
	})

	it("counts whole minutes, hours and days", () => {
		expect(timeAgo(ago(5 * 60_000 + 59_000), NOW)).toEqual({ unit: "minutes", count: 5 })
		expect(timeAgo(ago(3 * 3_600_000), NOW)).toEqual({ unit: "hours", count: 3 })
		expect(timeAgo(ago(2 * 86_400_000), NOW)).toEqual({ unit: "days", count: 2 })
	})

	it("becomes a date after a week", () => {
		expect(timeAgo(ago(10 * 86_400_000), NOW)).toEqual({ unit: "date" })
	})
})

describe("dayGroup", () => {
	// Local calendar days: built from local dates so the spec holds in any time zone.
	const noon = new Date(2026, 10, 3, 12, 0).getTime()
	const at = (day: number, hour: number) => new Date(2026, 10, day, hour, 0).toISOString()

	it("groups by calendar day, not by 24-hour spans", () => {
		expect(dayGroup(at(3, 0), noon)).toBe("today")
		expect(dayGroup(at(2, 23), noon)).toBe("yesterday")
		expect(dayGroup(at(2, 0), noon)).toBe("yesterday")
		expect(dayGroup(at(1, 12), noon)).toBe("week")
		expect(dayGroup(new Date(2026, 9, 28, 12).toISOString(), noon)).toBe("week")
		expect(dayGroup(new Date(2026, 9, 27, 12).toISOString(), noon)).toBe("older")
	})

	it("puts a time slightly ahead under today", () => {
		expect(dayGroup(at(3, 13), noon)).toBe("today")
	})
})
