import type { MoneyAmount } from "@/add-os/services/dashboard"

/**
 * Money arrives as plain decimal strings with at most two decimals ("300",
 * "150.5"), one currency per row. Adding them as floats would invent cents, so
 * they are added in hundredths, as integers, and handed back the same way.
 */
function toHundredths(amount: string): bigint {
	const negative = amount.startsWith("-")
	const [int, frac = ""] = amount.replace(/^-/, "").split(".")
	const value = BigInt(int || "0") * 100n + BigInt(`${frac}00`.slice(0, 2))
	return negative ? -value : value
}

function fromHundredths(value: bigint): string {
	const negative = value < 0n
	const abs = negative ? -value : value
	const int = abs / 100n
	const frac = (abs % 100n).toString().padStart(2, "0").replace(/0+$/, "")
	const body = frac ? `${int}.${frac}` : `${int}`
	return negative ? `-${body}` : body
}

export function addAmounts(amounts: Array<string | null | undefined>): string {
	return fromHundredths(amounts.reduce<bigint>((sum, amount) => sum + (amount ? toHundredths(amount) : 0n), 0n))
}

/** The amount in one currency out of a per-currency list, or null when that currency is absent. */
export function amountIn(list: MoneyAmount[], currency: string): string | null {
	return list.find(row => row.currency === currency)?.amount ?? null
}

/** Every currency that appears in any of the lists, in a stable order. */
export function currenciesOf(...lists: MoneyAmount[][]): string[] {
	return [...new Set(lists.flat().map(row => row.currency))].sort()
}
