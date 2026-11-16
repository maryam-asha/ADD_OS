import type { PayComponentKind } from "@/add-os/modules/hr/types/payroll"
import { describe, expect, it } from "vitest"
import { netPay, sumDecimals } from "../money"

function line(kind: PayComponentKind, amount: string, extra: { currency?: string; from?: string; to?: string | null } = {}) {
	return {
		amount,
		currency: extra.currency ?? "SYP",
		effective_from: extra.from ?? "2026-01-01",
		effective_to: extra.to ?? null,
		component: { id: 1, code: kind, name: { ar: kind, en: kind }, kind }
	}
}

describe("sumDecimals", () => {
	it("adds and takes away decimal strings exactly, at the widest scale given", () => {
		expect(sumDecimals(["0.1", "0.2"])).toBe("0.3")
		expect(sumDecimals(["500", "500"], ["10"])).toBe("990")
		expect(sumDecimals(["1250000.50"], ["0.75"])).toBe("1249999.75")
		expect(sumDecimals(["10"], ["25.5"])).toBe("-15.5")
		expect(sumDecimals([])).toBe("0")
	})
})

describe("netPay", () => {
	it("is today's earnings less today's deductions, one entry per currency", () => {
		const result = netPay(
			[
				line("earning", "500"),
				line("earning", "500"),
				line("deduction", "10"),
				line("earning", "200", { currency: "USD" }),
				line("employer_contribution", "70"),
				line("in_kind", "40"),
				line("earning", "999", { to: "2026-02-28" }),
				line("earning", "999", { from: "2026-12-01" })
			],
			"2026-11-12"
		)

		expect(result).toEqual([
			{ currency: "SYP", earnings: ["500", "500"], deductions: ["10"], net: "990" },
			{ currency: "USD", earnings: ["200"], deductions: [], net: "200" }
		])
	})

	it("is empty with no pay in force", () => {
		expect(netPay([line("earning", "100", { to: "2025-12-31" })], "2026-11-12")).toEqual([])
	})
})
