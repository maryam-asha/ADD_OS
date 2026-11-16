import type { Compensation } from "@/add-os/modules/hr/types/payroll"
import { formatCurrency, formatNumber, isCurrencyCode } from "@/add-os/utils/format"

/**
 * An HR amount: a decimal string (never parsed to float) in the currency the
 * server names. A currency the dashboard does not know still shows its digits
 * and its code rather than a wrong symbol.
 */
export function money(amount: string, currency: string): string {
	return isCurrencyCode(currency) ? formatCurrency(amount, { currency }) : `${formatNumber(amount)} ${currency}`
}

/** A decimal string as a whole number of `scale`-digit fractions, e.g. ("12.5", 2) → 1250. */
function toScaled(amount: string, scale: number): bigint {
	const text = amount.trim()
	const negative = text.startsWith("-")
	const [whole, fraction = ""] = text.replace(/^[-+]/, "").split(".")
	const digits = BigInt(`${whole || "0"}${fraction.padEnd(scale, "0").slice(0, scale)}`)
	return negative ? -digits : digits
}

function fromScaled(value: bigint, scale: number): string {
	const negative = value < BigInt(0)
	const digits = (negative ? -value : value).toString().padStart(scale + 1, "0")
	const text = scale ? `${digits.slice(0, -scale)}.${digits.slice(-scale)}` : digits
	return negative ? `-${text}` : text
}

/** `plus` added and `minus` taken away, in decimal strings, never through a float. */
export function sumDecimals(plus: readonly string[], minus: readonly string[] = []): string {
	const scale = Math.max(0, ...[...plus, ...minus].map(a => a.split(".")[1]?.length ?? 0))
	const total = [...plus.map(a => toScaled(a, scale)), ...minus.map(a => -toScaled(a, scale))].reduce((sum, a) => sum + a, BigInt(0))
	return fromScaled(total, scale)
}

/** One currency of an employee's pay: what is added, what is taken, and what is left. */
export interface NetPay {
	currency: string
	earnings: string[]
	deductions: string[]
	net: string
}

/**
 * The pay in force on `day`, per currency: earnings less deductions. An
 * employer contribution or a benefit in kind is a cost, not pay, so neither
 * counts.
 */
export function netPay(lines: readonly Pick<Compensation, "amount" | "currency" | "effective_from" | "effective_to" | "component">[], day: string): NetPay[] {
	const byCurrency = new Map<string, NetPay>()
	for (const line of lines) {
		if (line.effective_from > day || (line.effective_to && line.effective_to < day)) continue
		if (line.component.kind !== "earning" && line.component.kind !== "deduction") continue
		const entry = byCurrency.get(line.currency) ?? { currency: line.currency, earnings: [], deductions: [], net: "0" }
		if (line.component.kind === "earning") entry.earnings.push(line.amount)
		else entry.deductions.push(line.amount)
		byCurrency.set(line.currency, entry)
	}
	return [...byCurrency.values()].map(entry => ({ ...entry, net: sumDecimals(entry.earnings, entry.deductions) }))
}
