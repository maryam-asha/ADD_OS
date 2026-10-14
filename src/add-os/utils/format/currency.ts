import type { NumberFormatOptions } from "./numbers"
import type { SupportedLocale } from "@/add-os/lang/locales"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { formatNumber } from "./numbers"

/**
 * ADD OS — currency formatting.
 *
 * Prices are whole numbers and are shown without decimals (approved decision).
 * For a currency with decimals, "no decimals" stays a DISPLAY rule that never
 * silently drops a fraction — see the `fractionDigits` note below.
 *
 * The Syrian pound is the exception: it has no fractional unit in use, so it
 * is always shown whole, everywhere (product owner, 2026-10-04). The backend
 * rounds every SYP amount it asks for up to a whole pound (currencies.
 * decimal_places = 0), so this only ever rounds an older stored value.
 */

export type CurrencyCode = "SYP" | "USD" | "EUR"

interface CurrencyDefinition {
	/** Decimals shown when the amount is whole. */
	defaultFractionDigits: number
	/** Always shown whole, whatever the value or the caller asks for. */
	wholeOnly?: boolean
	symbol: Record<SupportedLocale, string>
}

/**
 * The symbol trails the amount in both languages. In an RTL paragraph the
 * bidi algorithm places the Latin-digit run first (visually rightmost), so
 * "1,234 ل.س" reads correctly without embedding any directional marks.
 * ⚠️ Not visually verified — see I18N-REPORT.md.
 */
const CURRENCIES: Record<CurrencyCode, CurrencyDefinition> = {
	SYP: { defaultFractionDigits: 0, wholeOnly: true, symbol: { ar: "ل.س", en: "SYP" } },
	USD: { defaultFractionDigits: 2, symbol: { ar: "$", en: "$" } },
	EUR: { defaultFractionDigits: 2, symbol: { ar: "€", en: "€" } }
}

export const DEFAULT_CURRENCY: CurrencyCode = "SYP"

/**
 * Narrows an API-supplied currency code to one this formatter knows.
 *
 * The backend types `currency` as an open string (it is whatever the display
 * currency resolved to), while `CurrencyCode` is deliberately closed to the
 * three we can render a symbol for. Callers use this to pass a known code
 * through and let `formatCurrency` fall back on anything else, rather than
 * casting an unchecked string into the union.
 */
export function isCurrencyCode(code: string | null | undefined): code is CurrencyCode {
	return code != null && code in CURRENCIES
}

/**
 * A currency's symbol in the active language ("ل.س", "$"), for layouts that
 * set it apart from the amount; an unknown code is its own symbol.
 */
export function currencySymbol(code: string, locale: SupportedLocale = currentLocale.value): string {
	return isCurrencyCode(code) ? CURRENCIES[code].symbol[locale] : code
}

export interface CurrencyFormatOptions extends Pick<NumberFormatOptions, "grouping"> {
	currency?: CurrencyCode
	locale?: SupportedLocale
	/**
	 * Force a decimal count.
	 *
	 * Left unset, the amount is shown as it is, without trailing zeros —
	 * "300", "150.5", "12.75" (the product owner's rule, 2026-10-12, matching
	 * the API's PlainAmount): the fraction is PRESERVED, never rounded away,
	 * and never padded to the currency's default decimals.
	 *
	 * That asymmetry is deliberate. `Intl` with `currency: "SYP"` rounds
	 * 1234567.89 to 1,234,568 and says nothing; with DECIMAL columns behind the
	 * wallet, a display that quietly discards digits is worse than an ugly one.
	 * Pass `fractionDigits` explicitly when rounding is genuinely intended.
	 */
	fractionDigits?: number
	/** Set false for inputs and exports, where the bare number is wanted. */
	showSymbol?: boolean
}

export function formatCurrency(value: number | string | bigint, options: CurrencyFormatOptions = {}): string {
	const {
		currency = DEFAULT_CURRENCY,
		locale = currentLocale.value,
		fractionDigits,
		grouping = true,
		showSymbol = true
	} = options

	const definition = CURRENCIES[currency]

	// A whole-only currency is always whole. Otherwise round only when told
	// to, or when there is nothing to lose by rounding.
	const digits = definition.wholeOnly ? 0 : fractionDigits

	const amount = formatNumber(value, { fractionDigits: digits, grouping, trimZeros: fractionDigits === undefined })

	return showSymbol ? `${amount} ${definition.symbol[locale]}` : amount
}
