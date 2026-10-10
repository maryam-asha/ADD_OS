/**
 * Exact point ↔ cash arithmetic for the top-up form: the dashboard's mirror of
 * the server's credit rule (ADDCore docs/superpowers/specs/
 * 2026-10-10-wallet-top-up-points-entry-design.md §3).
 *
 * Every value is parsed from the API's decimal strings into BigInt and never
 * becomes a JS number: `0.3 / 0.1` is 2.9999999999999996 in floating point,
 * which floors to 2 points where the server credits 3. The server re-derives
 * and verifies every top-up, so these functions decide what the operator sees,
 * never what is credited.
 */

/** A non-negative decimal as `units / 10^scale`. */
interface Decimal {
	units: bigint
	scale: number
}

const DECIMAL = /^\d+(?:\.\d+)?$/
const AMOUNT = /^\d+(?:\.\d{1,2})?$/

function parse(value: string): Decimal {
	const trimmed = value.trim()
	if (!DECIMAL.test(trimmed)) throw new RangeError(`Not a non-negative decimal: "${value}"`)
	const [whole, fraction = ""] = trimmed.split(".")
	return { units: BigInt(whole + fraction), scale: fraction.length }
}

function pow10(exponent: number): bigint {
	return 10n ** BigInt(exponent)
}

/** `units / 10^scale` as a plain decimal string, trailing fractional zeros dropped. */
function format(units: bigint, scale: number): string {
	const digits = units.toString().padStart(scale + 1, "0")
	if (scale === 0) return digits
	const whole = digits.slice(0, -scale)
	const fraction = digits.slice(-scale).replace(/0+$/, "")
	return fraction ? `${whole}.${fraction}` : whole
}

function divide(numerator: bigint, denominator: bigint): bigint {
	if (denominator === 0n) throw new RangeError("Division by zero in top-up arithmetic")
	return numerator / denominator
}

function divideUp(numerator: bigint, denominator: bigint): bigint {
	return divide(numerator + denominator - 1n, denominator)
}

/**
 * Arabic keyboards at reception type ٣٤٠ or ۳۴۰, and ٫ as the decimal mark.
 * Normalised to ASCII before anything parses them, so both quote alike.
 */
export function toAsciiDigits(value: string): string {
	return value
		.replace(/[\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669]/g, digit => String(digit.charCodeAt(0) - 0x0660))
		.replace(/[\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9]/g, digit => String(digit.charCodeAt(0) - 0x06F0))
		.replace(/٫/g, ".")
}

/** A positive amount with at most two decimals — what the server's `decimal:0,2` accepts. */
export function isPositiveAmount(value: string): boolean {
	const trimmed = value.trim()
	return AMOUNT.test(trimmed) && parse(trimmed).units > 0n
}

/** `"5000.00"` → `"5000"`: the same amount, written once. */
export function normalizeDecimal(value: string): string {
	const { units, scale } = parse(value)
	return format(units, scale)
}

/** Whole points `amount` buys: floor(amount × rateToBase / pointRateUsd) — the server's rule. */
export function pointsForAmount(amount: string, rateToBase: string, pointRateUsd: string): number {
	const a = parse(amount)
	const f = parse(rateToBase)
	const r = parse(pointRateUsd)
	// (a/10^as)·(f/10^fs) / (r/10^rs) = a·f·10^rs / (r·10^(as+fs))
	return Number(divide(a.units * f.units * pow10(r.scale), r.units * pow10(a.scale + f.scale)))
}

/**
 * The smallest multiple of `cashStep` that buys at least `points`: what to
 * collect for a points-first top-up. Rounding the cash up can buy more than
 * `points`; read the real count back with `pointsForAmount`.
 */
export function amountForPoints(points: number, rateToBase: string, pointRateUsd: string, cashStep: string): string {
	const f = parse(rateToBase)
	const r = parse(pointRateUsd)
	const s = parse(cashStep)
	// steps = ceil(p·R / (F·S)) = ceil(p·r·10^(fs+ss) / (f·s·10^rs))
	const steps = divideUp(BigInt(points) * r.units * pow10(f.scale + s.scale), f.units * s.units * pow10(r.scale))
	return format(steps * s.units, s.scale)
}

/** True when `amount` is a whole number of `cashStep`s. */
export function isMultipleOf(amount: string, cashStep: string): boolean {
	const a = parse(amount)
	const s = parse(cashStep)
	if (s.units === 0n) throw new RangeError("A cash step of zero")
	const scale = Math.max(a.scale, s.scale)
	return (a.units * pow10(scale - a.scale)) % (s.units * pow10(scale - s.scale)) === 0n
}

/**
 * The cash in `amount` beyond what its `points` are worth — too little to buy
 * another point — floored to `decimals` places, or null when that is nothing.
 */
export function remainderBelowOnePoint(amount: string, points: number, rateToBase: string, pointRateUsd: string, decimals: number): string | null {
	const a = parse(amount)
	const f = parse(rateToBase)
	const r = parse(pointRateUsd)
	// amount − p·R/F over the common denominator 10^as · f · 10^rs
	const numerator = a.units * f.units * pow10(r.scale) - BigInt(points) * r.units * pow10(f.scale + a.scale)
	const floored = divide(numerator * pow10(decimals), pow10(a.scale) * f.units * pow10(r.scale))
	return floored > 0n ? format(floored, decimals) : null
}
