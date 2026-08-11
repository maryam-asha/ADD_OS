/**
 * ADD OS — number formatting, built on strings rather than `Intl`.
 *
 * ── Why not `Intl.NumberFormat` ─────────────────────────────────────────────
 * Two measured reasons, not preference:
 *
 * 1. NUMERALS. `(1234.5).toLocaleString("ar-SY")` returns "١٬٢٣٤٫٥" — Arabic-Indic
 *    digits with Arabic separators. The decision is Latin digits everywhere, in
 *    both languages. Building the string from ASCII digits makes that true by
 *    construction; it cannot regress because a locale tag changed.
 *
 * 2. PRECISION. `Intl` with `{ style: "currency", currency: "SYP" }` silently
 *    drops the fraction, because CLDR defines the Syrian pound with zero minor
 *    units:
 *      (1234567.89).toLocaleString("ar-SY", {style:"currency",currency:"SYP"})
 *        → "‏١٬٢٣٤٬٥٦٨ ل.س.‏"        ← .89 gone, no warning
 *    For a wallet backed by DECIMAL columns that is silent data loss on screen.
 *
 * Everything here operates on the digit string, so a `string` input — which is
 * how a DECIMAL should cross the wire — keeps full precision no matter how many
 * digits it carries. Passing a JS `number` is the lossy step, and it happens
 * before this module is reached.
 */

/** Latin digits and Latin separators, in both languages. Change here only. */
const GROUP_SEPARATOR = ","
const DECIMAL_SEPARATOR = "."

export interface DecimalParts {
	negative: boolean
	/** Integer digits, no sign, no separators. Always at least "0". */
	int: string
	/** Fraction digits, no leading dot. Empty when the value is whole. */
	frac: string
}

/** Expands exponent notation so large/small numbers never reach the output as "1e+21". */
function toPlainString(value: number): string {
	const text = String(value)
	if (!/e/i.test(text)) return text

	const [mantissa, exponent] = text.split(/e/i)
	const exp = Number(exponent)
	const negative = mantissa.startsWith("-")
	const digits = negative ? mantissa.slice(1) : mantissa
	const [intPart, fracPart = ""] = digits.split(".")

	let expanded: string
	if (exp >= 0) {
		expanded =
			exp >= fracPart.length
				? intPart + fracPart + "0".repeat(exp - fracPart.length)
				: `${intPart + fracPart.slice(0, exp)}.${fracPart.slice(exp)}`
	} else {
		const shift = -exp
		expanded =
			shift >= intPart.length
				? `0.${"0".repeat(shift - intPart.length)}${intPart}${fracPart}`
				: `${intPart.slice(0, intPart.length - shift)}.${intPart.slice(intPart.length - shift)}${fracPart}`
	}

	return (negative ? "-" : "") + expanded
}

/** Splits any accepted numeric input into sign / integer / fraction, losing nothing. */
export function decompose(value: number | string | bigint): DecimalParts {
	let raw: string

	if (typeof value === "bigint") {
		raw = value.toString()
	} else if (typeof value === "string") {
		raw = value.trim()
	} else {
		if (!Number.isFinite(value)) {
			throw new RangeError(`formatNumber: expected a finite number, received ${value}`)
		}
		raw = toPlainString(value)
	}

	if (raw === "") {
		throw new TypeError("formatNumber: received an empty string")
	}

	const negative = raw.startsWith("-")
	if (negative || raw.startsWith("+")) raw = raw.slice(1)

	if (!/^\d*(?:\.\d*)?$/.test(raw)) {
		throw new TypeError(`formatNumber: "${raw}" is not a plain decimal value`)
	}

	const [int = "", frac = ""] = raw.split(".")

	return {
		negative,
		int: int.replace(/^0+(?=\d)/, "") || "0",
		frac: frac.replace(/0+$/, "")
	}
}

/** Adds 1 to a non-negative integer digit string, carrying as far as needed. */
function increment(digits: string): string {
	const out = digits.split("")
	let i = out.length - 1

	while (i >= 0) {
		if (out[i] === "9") {
			out[i] = "0"
			i--
		} else {
			out[i] = String(Number(out[i]) + 1)
			break
		}
	}

	if (i < 0) out.unshift("1")
	return out.join("")
}

/** Half-up rounding on the digit string — away from zero, no float involved. */
export function round(parts: DecimalParts, digits: number): DecimalParts {
	if (parts.frac.length <= digits) {
		return { ...parts, frac: parts.frac.padEnd(digits, "0") }
	}

	const kept = parts.frac.slice(0, digits)
	const roundUp = Number(parts.frac[digits]) >= 5
	let combined = parts.int + kept
	if (roundUp) combined = increment(combined)

	return {
		negative: parts.negative,
		int: digits === 0 ? combined : combined.slice(0, combined.length - digits) || "0",
		frac: digits === 0 ? "" : combined.slice(combined.length - digits)
	}
}

/** Inserts the thousands separator every three digits from the right. */
export function group(int: string): string {
	return int.replace(/\B(?=(?:\d{3})+(?!\d))/g, GROUP_SEPARATOR)
}

export interface NumberFormatOptions {
	/**
	 * Round to exactly this many decimals. Omit to keep the value's own
	 * precision — the default deliberately never discards digits it was given.
	 */
	fractionDigits?: number
	/** Pad up to this many decimals. Ignored when `fractionDigits` is set. */
	minFractionDigits?: number
	/** Thousands separators. Turn off for years, IDs, and similar. */
	grouping?: boolean
}

export function formatNumber(value: number | string | bigint, options: NumberFormatOptions = {}): string {
	const { fractionDigits, minFractionDigits = 0, grouping = true } = options

	let parts = decompose(value)

	if (fractionDigits !== undefined) {
		parts = round(parts, fractionDigits)
	} else if (parts.frac.length < minFractionDigits) {
		parts = { ...parts, frac: parts.frac.padEnd(minFractionDigits, "0") }
	}

	const int = grouping ? group(parts.int) : parts.int
	const body = parts.frac ? int + DECIMAL_SEPARATOR + parts.frac : int
	const isZero = parts.int === "0" && !/[1-9]/.test(parts.frac)

	return parts.negative && !isZero ? `-${body}` : body
}

/** True when the value carries a non-zero fraction — used to avoid silent truncation. */
export function hasFraction(value: number | string | bigint): boolean {
	return /[1-9]/.test(decompose(value).frac)
}
