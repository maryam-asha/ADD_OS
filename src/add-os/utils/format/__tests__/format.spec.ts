import { dateArDZ } from "naive-ui"
import { describe, expect, it } from "vitest"
import { MONTHS } from "../calendar"
import { formatCurrency } from "../currency"
import { formatClockTime, formatDate, formatDateTime, formatTime, toOffsetIso } from "../dates"
import { dateArLevantine } from "../naiveDateLocale"
import { formatNumber, hasFraction } from "../numbers"

const AR = { locale: "ar" } as const
const EN = { locale: "en" } as const

describe("formatNumber — Latin digits, always", () => {
	it("groups thousands", () => {
		expect(formatNumber(1234567)).toBe("1,234,567")
		expect(formatNumber(1000)).toBe("1,000")
		expect(formatNumber(999)).toBe("999")
	})

	it("emits ASCII digits and never Arabic-Indic ones", () => {
		// The failure this guards: (1234567).toLocaleString("ar-SY") → "١٬٢٣٤٬٥٦٧"
		expect(formatNumber(1234567)).toMatch(/^[\d,]+$/)
		expect(formatNumber("9876543210")).toBe("9,876,543,210")
	})

	it("keeps a value's own precision when told nothing", () => {
		expect(formatNumber("1234.5")).toBe("1,234.5")
		expect(formatNumber("0.125")).toBe("0.125")
	})

	it("rounds half-up only when asked", () => {
		expect(formatNumber("1234.56", { fractionDigits: 1 })).toBe("1,234.6")
		expect(formatNumber("0.5", { fractionDigits: 0 })).toBe("1")
		expect(formatNumber("0.4", { fractionDigits: 0 })).toBe("0")
		expect(formatNumber("9.99", { fractionDigits: 1 })).toBe("10.0")
		expect(formatNumber("999.9", { fractionDigits: 0 })).toBe("1,000")
	})

	it("pads to a minimum when asked", () => {
		expect(formatNumber(5, { minFractionDigits: 2 })).toBe("5.00")
	})

	it("can drop grouping, for years and identifiers", () => {
		expect(formatNumber(2026, { grouping: false })).toBe("2026")
	})

	it("handles negatives and zero without producing '-0'", () => {
		expect(formatNumber(-1234.5)).toBe("-1,234.5")
		expect(formatNumber(0)).toBe("0")
		expect(formatNumber("-0.00")).toBe("0")
	})

	it("accepts bigint and huge strings beyond Number's safe range", () => {
		expect(formatNumber(9007199254740993n)).toBe("9,007,199,254,740,993")
		expect(formatNumber("123456789012345678901234567890")).toBe("123,456,789,012,345,678,901,234,567,890")
	})

	it("expands exponent notation instead of printing '1e+21'", () => {
		expect(formatNumber(1e21)).toBe("1,000,000,000,000,000,000,000")
		expect(formatNumber(1e-7)).toBe("0.0000001")
	})

	it("rejects values it cannot format rather than guessing", () => {
		expect(() => formatNumber(Number.NaN)).toThrow(RangeError)
		expect(() => formatNumber(Number.POSITIVE_INFINITY)).toThrow(RangeError)
		expect(() => formatNumber("12,34")).toThrow(TypeError)
		expect(() => formatNumber("")).toThrow(TypeError)
	})
})

describe("formatCurrency — SYP is always whole", () => {
	it("shows whole amounts with no decimals", () => {
		expect(formatCurrency(85000, AR)).toBe("85,000 ل.س")
		expect(formatCurrency(85000, EN)).toBe("85,000 SYP")
	})

	it("never shows piasters, even when the value carries them", () => {
		// The pound has no fractional unit in use (product owner, 2026-10-04).
		expect(formatCurrency("1234567.89", AR)).toBe("1,234,568 ل.س")
		expect(formatCurrency("33216.02", EN)).toBe("33,216 SYP")
	})

	it("stays whole even when a caller asks for decimals", () => {
		expect(formatCurrency("1234.56", { ...AR, fractionDigits: 2 })).toBe("1,235 ل.س")
	})

	it("keeps full precision for huge DECIMAL values passed as strings", () => {
		expect(formatCurrency("99999999999999999999.05", EN)).toBe("99,999,999,999,999,999,999 SYP")
	})

	it("still keeps a fraction for a currency that has one", () => {
		expect(formatCurrency("12.345", { ...EN, currency: "USD" })).toBe("12.345 $")
	})

	it("can omit the symbol, for inputs and exports", () => {
		expect(formatCurrency(85000, { ...AR, showSymbol: false })).toBe("85,000")
	})

	it("shows an amount as it is, without trailing zeros", () => {
		expect(formatCurrency(1500, { ...EN, currency: "USD" })).toBe("1,500 $")
		expect(formatCurrency("1500.00", { ...EN, currency: "USD" })).toBe("1,500 $")
		expect(formatCurrency("150.50", { ...EN, currency: "USD" })).toBe("150.5 $")
		expect(formatCurrency("12.75", { ...EN, currency: "USD" })).toBe("12.75 $")
		expect(formatCurrency(1500, { ...EN, currency: "USD", fractionDigits: 2 })).toBe("1,500.00 $")
	})

	it("hasFraction distinguishes real fractions from trailing zeros", () => {
		expect(hasFraction("10.00")).toBe(false)
		expect(hasFraction("10.01")).toBe(true)
		expect(hasFraction(10)).toBe(false)
	})
})

describe("formatDate — Levantine months, Latin digits", () => {
	const sunday = new Date(2026, 7, 2, 14, 35)

	it("uses the Levantine month name, not أوت or أغسطس", () => {
		expect(MONTHS.ar[7]).toBe("آب")
		expect(formatDate(sunday, AR)).toBe("2 آب 2026")
		expect(formatDate(sunday, AR)).not.toContain("أوت")
		expect(formatDate(sunday, AR)).not.toContain("أغسطس")
	})

	it("uses standard Gregorian names in English", () => {
		expect(formatDate(sunday, EN)).toBe("2 August 2026")
	})

	it("covers every style", () => {
		expect(formatDate(sunday, { ...AR, style: "iso" })).toBe("2026-08-02")
		expect(formatDate(sunday, { ...AR, style: "short" })).toBe("02/08/2026")
		expect(formatDate(sunday, { ...AR, style: "monthYear" })).toBe("آب 2026")
		expect(formatDate(sunday, { ...AR, style: "long" })).toBe("الأحد، 2 آب 2026")
		expect(formatDate(sunday, { ...EN, style: "long" })).toBe("Sunday, 2 August 2026")
		expect(formatDate(sunday, { ...AR, style: "dateTime" })).toBe("2 آب 2026، 02:35 م")
		expect(formatDate(sunday, { ...EN, style: "dateTime" })).toBe("2 August 2026, 02:35 PM")
	})

	it("keeps digits Latin in Arabic output", () => {
		// `\p{Nd}` matches Arabic-Indic digits too, so collect every digit the
		// output contains and assert each one is ASCII.
		const digits = formatDate(sunday, AR).match(/\p{Nd}/gu) ?? []

		expect(digits.length).toBeGreaterThan(0)
		expect(digits.every(digit => digit >= "0" && digit <= "9")).toBe(true)
	})

	it("formats time as 12-hour, zero-padded, with the meridiem after it", () => {
		expect(formatTime(new Date(2026, 7, 2, 9, 5), AR)).toBe("09:05 ص")
		expect(formatTime(new Date(2026, 7, 2, 9, 5), EN)).toBe("09:05 AM")
		expect(formatDateTime(sunday, EN)).toBe("2 August 2026, 02:35 PM")
	})

	it("writes noon as 12 PM and midnight as 12 AM, never 00", () => {
		expect(formatTime(new Date(2026, 7, 2, 12, 0), EN)).toBe("12:00 PM")
		expect(formatTime(new Date(2026, 7, 2, 0, 0), EN)).toBe("12:00 AM")
		expect(formatTime(new Date(2026, 7, 2, 0, 30), AR)).toBe("12:30 ص")
	})

	it("formats a bare HH:mm wall-clock string the same way", () => {
		expect(formatClockTime("14:30", AR)).toBe("02:30 م")
		expect(formatClockTime("08:00:00", EN)).toBe("08:00 AM")
		expect(formatClockTime("00:00", EN)).toBe("12:00 AM")
		expect(formatClockTime("24:00", EN)).toBe("12:00 AM")
		// The booking endpoints already send 12-hour; only the meridiem is localised.
		expect(formatClockTime("02:00 PM", AR)).toBe("02:00 م")
		expect(formatClockTime("12:00 AM", AR)).toBe("12:00 ص")
		expect(formatClockTime("12:30 PM", EN)).toBe("12:30 PM")
		// Display-only: anything that is not a clock time passes through untouched.
		expect(formatClockTime("", EN)).toBe("")
		expect(formatClockTime("soon", EN)).toBe("soon")
	})

	it("names all twelve Levantine months", () => {
		expect([...MONTHS.ar]).toEqual([
			"كانون الثاني",
			"شباط",
			"آذار",
			"نيسان",
			"أيّار",
			"حزيران",
			"تمّوز",
			"آب",
			"أيلول",
			"تشرين الأول",
			"تشرين الثاني",
			"كانون الأول"
		])
	})

	it("accepts ISO strings and timestamps", () => {
		expect(formatDate("2026-08-02T00:00:00", EN)).toBe("2 August 2026")
		expect(formatDate(new Date(2026, 0, 1).getTime(), AR)).toBe("1 كانون الثاني 2026")
	})

	it("rejects an invalid date rather than rendering 'Invalid Date'", () => {
		expect(() => formatDate("not a date")).toThrow(TypeError)
	})
})

describe("naive-ui date panel locale", () => {
	// naive-ui's date picker renders month names by calling `localize.month`
	// on the NDateLocale it is handed. These assert the picker itself agrees
	// with `formatDate`, rather than falling back to naive-ui's Algerian bundle.
	const localize = dateArLevantine.locale.localize
	const upstream = dateArDZ.locale.localize

	// date-fns types `localize` as optional; naive-ui always ships it. Fail loudly
	// rather than let the assertions below silently skip.
	if (!localize || !upstream) {
		throw new Error("naive-ui's Arabic date locale is missing `localize`")
	}

	it("baseline: naive-ui's own Arabic bundle really does say أوت", () => {
		expect(upstream.month(7, { width: "wide" })).toBe("أوت")
	})

	it("our wrapper returns the Levantine name instead", () => {
		expect(localize.month(7, { width: "wide" })).toBe("آب")
		expect(localize.month(0, { width: "wide" })).toBe("كانون الثاني")
		expect(localize.month(9, { width: "abbreviated" })).toBe("تشرين الأول")
	})

	it("covers all twelve months and matches formatDate exactly", () => {
		for (let index = 0; index < 12; index++) {
			expect(localize.month(index, { width: "wide" })).toBe(MONTHS.ar[index])
		}
	})

	it("inherits everything else from naive-ui untouched", () => {
		expect(localize.day).toBe(upstream.day)
		expect(dateArLevantine.locale.formatLong).toBe(dateArDZ.locale.formatLong)
		expect(dateArLevantine.locale.match).toBe(dateArDZ.locale.match)
	})
})

describe("toOffsetIso", () => {
	it("writes local wall clock with an explicit offset, not a Z instant", () => {
		const at = new Date(2026, 9, 1, 23, 30, 0)

		expect(toOffsetIso(at)).toMatch(/^2026-10-01T23:30:00[+-]\d{2}:\d{2}$/)
	})

	/**
	 * The reason this exists. A bare "2026-10-01 23:30:00" is read by the API
	 * as the district's timezone; from a browser anywhere else that silently
	 * moves the event. Stating the offset makes the instant unambiguous.
	 */
	it("round-trips to the instant it was given, from any timezone", () => {
		const at = new Date(2026, 9, 1, 23, 30, 0)

		expect(new Date(toOffsetIso(at)).getTime()).toBe(at.getTime())
	})

	it("keeps a late evening on its own date rather than rolling it over", () => {
		const at = new Date(2026, 9, 1, 23, 30, 0)

		expect(toOffsetIso(at).startsWith("2026-10-01T23:30")).toBe(true)
	})

	it("accepts a string or a timestamp, like the other formatters", () => {
		const at = new Date(2026, 9, 1, 9, 5, 0)

		expect(toOffsetIso(at.getTime())).toBe(toOffsetIso(at))
	})
})
