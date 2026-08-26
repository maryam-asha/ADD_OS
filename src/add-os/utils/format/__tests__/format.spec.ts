import { dateArDZ } from "naive-ui"
import { describe, expect, it } from "vitest"
import { MONTHS } from "../calendar"
import { formatCurrency } from "../currency"
import { formatDate, formatDateTime, formatRelativeTime, formatTime, toOffsetIso } from "../dates"
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

describe("formatCurrency — SYP without silent rounding", () => {
	it("shows whole amounts with no decimals", () => {
		expect(formatCurrency(85000, AR)).toBe("85,000 ل.س.")
		expect(formatCurrency(85000, EN)).toBe("85,000 SYP")
	})

	it("preserves a fraction instead of dropping it", () => {
		// Intl.NumberFormat("ar-SY", {style:"currency",currency:"SYP"}) yields
		// "١٬٢٣٤٬٥٦٨ ل.س." — wrong numerals AND .89 discarded without a word.
		expect(formatCurrency("1234567.89", AR)).toBe("1,234,567.89 ل.س.")
		expect(formatCurrency("0.01", EN)).toBe("0.01 SYP")
	})

	it("rounds only when rounding is explicitly requested", () => {
		expect(formatCurrency("1234.56", { ...AR, fractionDigits: 0 })).toBe("1,235 ل.س.")
		expect(formatCurrency("1234.56", { ...AR, fractionDigits: 2 })).toBe("1,234.56 ل.س.")
	})

	it("keeps full precision for DECIMAL values passed as strings", () => {
		expect(formatCurrency("99999999999999999999.05", EN)).toBe("99,999,999,999,999,999,999.05 SYP")
	})

	it("can omit the symbol, for inputs and exports", () => {
		expect(formatCurrency(85000, { ...AR, showSymbol: false })).toBe("85,000")
	})

	it("uses two decimals for currencies that have them", () => {
		expect(formatCurrency(1500, { ...EN, currency: "USD" })).toBe("1,500.00 $")
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
		expect(formatDate(sunday, { ...AR, style: "dateTime" })).toBe("2 آب 2026، 14:35")
		expect(formatDate(sunday, { ...EN, style: "dateTime" })).toBe("2 August 2026, 14:35")
	})

	it("keeps digits Latin in Arabic output", () => {
		// `\p{Nd}` matches Arabic-Indic digits too, so collect every digit the
		// output contains and assert each one is ASCII.
		const digits = formatDate(sunday, AR).match(/\p{Nd}/gu) ?? []

		expect(digits.length).toBeGreaterThan(0)
		expect(digits.every(digit => digit >= "0" && digit <= "9")).toBe(true)
	})

	it("formats time as 24-hour, zero-padded", () => {
		expect(formatTime(new Date(2026, 7, 2, 9, 5), AR)).toBe("09:05")
		expect(formatDateTime(sunday, EN)).toBe("2 August 2026, 14:35")
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

describe("formatRelativeTime", () => {
	const NOW = new Date(2026, 7, 25, 12, 0, 0)
	const ago = (seconds: number) => new Date(NOW.getTime() - seconds * 1000)

	it("floors anything under a minute to a 'just now' phrase", () => {
		expect(formatRelativeTime(ago(0), { ...EN, now: NOW })).toBe("just now")
		expect(formatRelativeTime(ago(59), { ...EN, now: NOW })).toBe("just now")
		expect(formatRelativeTime(ago(59), { ...AR, now: NOW })).toBe("الآن")
	})

	it("treats a future timestamp as 'just now' rather than emitting a negative count", () => {
		expect(formatRelativeTime(new Date(NOW.getTime() + 5000), { ...EN, now: NOW })).toBe("just now")
	})

	it("counts minutes, hours and days in English with plain plurals", () => {
		expect(formatRelativeTime(ago(60), { ...EN, now: NOW })).toBe("1 minute ago")
		expect(formatRelativeTime(ago(300), { ...EN, now: NOW })).toBe("5 minutes ago")
		expect(formatRelativeTime(ago(3600), { ...EN, now: NOW })).toBe("1 hour ago")
		expect(formatRelativeTime(ago(7200), { ...EN, now: NOW })).toBe("2 hours ago")
		expect(formatRelativeTime(ago(86400), { ...EN, now: NOW })).toBe("1 day ago")
		expect(formatRelativeTime(ago(86400 * 3), { ...EN, now: NOW })).toBe("3 days ago")
	})

	/**
	 * The whole reason this formatter is hand-rolled. Arabic counted nouns take
	 * four distinct forms, and collapsing them to singular/plural is what every
	 * naive implementation does:
	 *   1    → the bare noun, no numeral
	 *   2    → the dual form, no numeral
	 *   3-10 → numeral + plural of paucity
	 *   11+  → numeral + singular
	 */
	it("uses all four Arabic plural categories for minutes", () => {
		expect(formatRelativeTime(ago(60), { ...AR, now: NOW })).toBe("منذ دقيقة")
		expect(formatRelativeTime(ago(120), { ...AR, now: NOW })).toBe("منذ دقيقتين")
		expect(formatRelativeTime(ago(300), { ...AR, now: NOW })).toBe("منذ 5 دقائق")
		expect(formatRelativeTime(ago(600), { ...AR, now: NOW })).toBe("منذ 10 دقائق")
		expect(formatRelativeTime(ago(660), { ...AR, now: NOW })).toBe("منذ 11 دقيقة")
		expect(formatRelativeTime(ago(1500), { ...AR, now: NOW })).toBe("منذ 25 دقيقة")
	})

	it("uses all four Arabic plural categories for hours", () => {
		expect(formatRelativeTime(ago(3600), { ...AR, now: NOW })).toBe("منذ ساعة")
		expect(formatRelativeTime(ago(7200), { ...AR, now: NOW })).toBe("منذ ساعتين")
		expect(formatRelativeTime(ago(3600 * 4), { ...AR, now: NOW })).toBe("منذ 4 ساعات")
		expect(formatRelativeTime(ago(3600 * 13), { ...AR, now: NOW })).toBe("منذ 13 ساعة")
	})

	it("uses all four Arabic plural categories for days", () => {
		expect(formatRelativeTime(ago(86400), { ...AR, now: NOW })).toBe("منذ يوم")
		expect(formatRelativeTime(ago(86400 * 2), { ...AR, now: NOW })).toBe("منذ يومين")
		expect(formatRelativeTime(ago(86400 * 6), { ...AR, now: NOW })).toBe("منذ 6 أيام")
		expect(formatRelativeTime(ago(86400 * 12), { ...AR, now: NOW })).toBe("منذ 12 يوم")
	})

	/**
	 * Collects every digit and asserts each is ASCII, rather than testing against
	 * an Arabic-Indic range — the same approach `formatDate`'s own "keeps digits
	 * Latin" case above takes, and for the same two reasons: `\p{Nd}` catches any
	 * non-Latin digit set rather than only the one range someone thought to
	 * exclude, and a literal `[٠-٩]` in source is a character range a reader
	 * cannot verify at a glance (the regexp lint rule rejects it on that ground).
	 */
	it("emits Latin digits, never Arabic-Indic ones", () => {
		const rendered = formatRelativeTime(ago(300), { ...AR, now: NOW })
		const digits = rendered.match(/\p{Nd}/gu) ?? []

		expect(rendered).toContain("5")
		expect(digits.length).toBeGreaterThan(0)
		expect(digits.every(digit => digit >= "0" && digit <= "9")).toBe(true)
	})

	it("accepts an ISO string as readily as a Date", () => {
		expect(formatRelativeTime(ago(300).toISOString(), { ...EN, now: NOW })).toBe("5 minutes ago")
	})
})

/**
 * The collection's own example is `"2026-08-17T11:00:00+03:00"` — local wall
 * clock with an explicit offset, not a UTC `Z` string. Asserted structurally
 * rather than against a literal offset, because the suite runs in whatever
 * zone the machine is set to; a hardcoded `+03:00` would pass in Damascus and
 * fail elsewhere without either result meaning anything.
 *
 * These cases moved here from `services/__tests__/reception.spec.ts` when
 * `toOffsetIso` did, unchanged.
 */
describe("toOffsetIso", () => {
	it("emits local wall-clock time with an explicit UTC offset", () => {
		const at = new Date(2026, 7, 17, 11, 0, 0)

		expect(toOffsetIso(at)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/)
		expect(toOffsetIso(at).startsWith("2026-08-17T11:00:00")).toBe(true)
	})

	it("round-trips to the same instant it was given", () => {
		const at = new Date(2026, 0, 3, 7, 5, 9)

		expect(new Date(toOffsetIso(at)).getTime()).toBe(at.getTime())
	})

	it("zero-pads every component", () => {
		expect(toOffsetIso(new Date(2026, 0, 3, 7, 5, 9)).slice(0, 19)).toBe("2026-01-03T07:05:09")
	})
})
