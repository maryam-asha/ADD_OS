import { describe, expect, it } from "vitest"

import {
	amountForPoints,
	isMultipleOf,
	isPositiveAmount,
	normalizeDecimal,
	pointsForAmount,
	remainderBelowOnePoint,
	toAsciiDigits
} from "../top-up-math"

const POINT_RATE = "0.10"
/** The old-pound rate ADDCore's tests and ExchangeRateFactory use. */
const OLD_SYP = "0.0000680272"
/** 1/147 — the new pound. */
const NEW_SYP = "0.0068027211"

/** Same vectors as ADDCore's PointConversionServiceTest: the two sides must agree. */
describe("pointsForAmount", () => {
	it.each([
		["500000", OLD_SYP, 340],
		["501200", OLD_SYP, 340],
		["150000.00", "0.0000666667", 100],
		["5000", NEW_SYP, 340],
		["0.30", "1", 3],
		["10.05", "1", 100]
	])("%s at %s buys %i points", (amount, rate, expected) => {
		expect(pointsForAmount(amount, rate, POINT_RATE)).toBe(expected)
	})

	it("throws on a malformed amount instead of guessing", () => {
		expect(() => pointsForAmount("abc", "1", POINT_RATE)).toThrow(RangeError)
	})
})

describe("amountForPoints", () => {
	it.each([
		[340, OLD_SYP, "100", "499900"],
		[10, OLD_SYP, "100", "14800"],
		[345, "1", "1", "35"],
		[340, NEW_SYP, "1", "4998"],
		[340, NEW_SYP, "10", "5000"],
		[10, NEW_SYP, "1", "147"],
		[3, "1", "0.10", "0.3"],
		[340, OLD_SYP, "100.00", "499900"]
	])("%i points at %s with step %s costs %s", (points, rate, step, expected) => {
		expect(amountForPoints(points, rate, POINT_RATE, step)).toBe(expected)
	})

	it("always buys at least the points asked for", () => {
		const cases = [[OLD_SYP, "100"], [NEW_SYP, "1"], [NEW_SYP, "10"], ["1", "1"], ["1", "0.01"]] as const
		for (const [rate, step] of cases) {
			for (let points = 1; points <= 2000; points += 7) {
				const amount = amountForPoints(points, rate, POINT_RATE, step)
				expect(pointsForAmount(amount, rate, POINT_RATE)).toBeGreaterThanOrEqual(points)
			}
		}
	})

	it("stays exact for very large counts", () => {
		const amount = amountForPoints(10_000_000, OLD_SYP, POINT_RATE, "1")
		expect(amount).toBe("14700002353")
		expect(pointsForAmount(amount, OLD_SYP, POINT_RATE)).toBe(10_000_000)
	})

	it("throws on a zero rate or step instead of dividing by it", () => {
		expect(() => amountForPoints(10, "0", POINT_RATE, "1")).toThrow(RangeError)
		expect(() => amountForPoints(10, "1", POINT_RATE, "0")).toThrow(RangeError)
	})
})

describe("remainderBelowOnePoint", () => {
	it.each([
		["500000", 340, OLD_SYP, "199.92"],
		["5000", 340, NEW_SYP, "2"],
		["4998", 340, NEW_SYP, null],
		["34", 340, "1", null]
	])("%s buying %i points at %s leaves %s", (amount, points, rate, expected) => {
		expect(remainderBelowOnePoint(amount, points, rate, POINT_RATE, 2)).toBe(expected)
	})
})

describe("isMultipleOf", () => {
	it.each([
		["5000", "10", true],
		["4995", "10", false],
		["12.50", "1", false],
		["12.50", "0.50", true],
		["100", "100.00", true],
		["0.3", "0.10", true]
	])("%s is a multiple of %s: %s", (amount, step, expected) => {
		expect(isMultipleOf(amount, step)).toBe(expected)
	})
})

describe("isPositiveAmount", () => {
	it("accepts positive amounts with at most two decimals", () => {
		for (const ok of ["1", "0.01", "12.5", "500000", " 42 "]) expect(isPositiveAmount(ok)).toBe(true)
	})

	it("rejects zero, negatives, extra decimals and anything not a plain decimal", () => {
		for (const bad of ["", " ", "0", "0.00", "-5", "abc", "1.234", "1e3", "1,000"]) expect(isPositiveAmount(bad)).toBe(false)
	})
})

describe("normalizeDecimal", () => {
	it("drops trailing fractional zeros and a bare decimal point", () => {
		expect(normalizeDecimal("5000.00")).toBe("5000")
		expect(normalizeDecimal("12.50")).toBe("12.5")
		expect(normalizeDecimal("007")).toBe("7")
	})
})

describe("toAsciiDigits", () => {
	it("reads Arabic-Indic and Extended Arabic-Indic digits and the Arabic decimal mark", () => {
		expect(toAsciiDigits("٣٤٠")).toBe("340")
		expect(toAsciiDigits("۳۴۰")).toBe("340")
		expect(toAsciiDigits("١٢٫٥")).toBe("12.5")
		expect(toAsciiDigits("340")).toBe("340")
	})
})
