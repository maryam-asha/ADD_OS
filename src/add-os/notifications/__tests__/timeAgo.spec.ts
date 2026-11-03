import { describe, expect, it } from "vitest"

import { timeAgo } from "../timeAgo"

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
