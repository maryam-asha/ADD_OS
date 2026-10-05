import { describe, expect, it } from "vitest"
import { normalizeSale, saleState } from "../sale"

describe("normalizeSale", () => {
	it("turns empty values into null and keeps all three keys", () => {
		const out = normalizeSale({ price_points: 120, sale_price_points: undefined, sale_starts_at: "", sale_ends_at: "" }, "sale_price_points")
		expect(out).toEqual({ price_points: 120, sale_price_points: null, sale_starts_at: null, sale_ends_at: null })
	})

	it("sends a partial fill as it is, so the server can name the missing field", () => {
		const out = normalizeSale({ sale_hourly_rate_points: 80, sale_starts_at: "", sale_ends_at: null }, "sale_hourly_rate_points")
		expect(out).toEqual({ sale_hourly_rate_points: 80, sale_starts_at: null, sale_ends_at: null })
		expect(Object.keys(out)).toEqual(["sale_hourly_rate_points", "sale_starts_at", "sale_ends_at"])
	})

	it("leaves set values alone", () => {
		const out = normalizeSale({ sale_price_points: 100, sale_starts_at: "2026-10-05T10:00:00+03:00", sale_ends_at: "2026-10-07T10:00:00+03:00" }, "sale_price_points")
		expect(out.sale_starts_at).toBe("2026-10-05T10:00:00+03:00")
	})
})

describe("saleState", () => {
	const now = new Date("2026-10-06T00:00:00Z")
	it("is none without a window", () => expect(saleState(null, null, now)).toBe("none"))
	it("is scheduled before the start", () => expect(saleState("2026-10-07T00:00:00Z", "2026-10-08T00:00:00Z", now)).toBe("scheduled"))
	it("is running inside the window, start inclusive", () => expect(saleState("2026-10-06T00:00:00Z", "2026-10-08T00:00:00Z", now)).toBe("running"))
	it("is ended at the end, end exclusive", () => expect(saleState("2026-10-01T00:00:00Z", "2026-10-06T00:00:00Z", now)).toBe("ended"))
})
