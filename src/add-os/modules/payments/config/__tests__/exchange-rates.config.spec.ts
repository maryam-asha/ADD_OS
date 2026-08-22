import { describe, expect, it } from "vitest"

import { latestRatesByCurrency } from "../exchange-rates.config"

describe("latestRatesByCurrency", () => {
	it("picks the row with the latest effective_from per currency", () => {
		const rates = [
			{ id: 1, currency_code: "USD" as const, rate_to_base: "14500.0000", effective_from: "2026-08-17T00:00:00.000000Z", set_by: 1, created_at: "" },
			{ id: 2, currency_code: "USD" as const, rate_to_base: "14800.0000", effective_from: "2026-08-19T00:00:00.000000Z", set_by: 1, created_at: "" }
		]

		expect(latestRatesByCurrency(rates)).toEqual([rates[1]])
	})

	it("breaks a tied effective_from by the highest id — matches the one tied case observed live", () => {
		const rates = [
			{ id: 2, currency_code: "USD" as const, rate_to_base: "14800.0000", effective_from: "2026-08-19T00:00:00.000000Z", set_by: 1, created_at: "" },
			{ id: 3, currency_code: "USD" as const, rate_to_base: "15000.0000", effective_from: "2026-08-19T00:00:00.000000Z", set_by: 1, created_at: "" }
		]

		expect(latestRatesByCurrency(rates)).toEqual([rates[1]])
	})

	it("returns one entry per distinct currency_code", () => {
		const rates = [
			{ id: 1, currency_code: "USD" as const, rate_to_base: "14500.0000", effective_from: "2026-08-17T00:00:00.000000Z", set_by: 1, created_at: "" }
		]

		expect(latestRatesByCurrency(rates)).toHaveLength(1)
	})

	it("returns an empty array for an empty input", () => {
		expect(latestRatesByCurrency([])).toEqual([])
	})
})
