import type { NumberFormatOptions } from "./numbers"
import type { SupportedLocale } from "@/add-os/lang/locales"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { formatNumber, hasFraction } from "./numbers"

/**
 * ADD OS — currency formatting.
 *
 * Prices are whole numbers and are shown without decimals (approved decision).
 * But "no decimals" is a DISPLAY rule, and the formatter must never turn it
 * into silent data loss when a value does carry a fraction — see the
 * `fractionDigits` note below.
 */

export type CurrencyCode = "SYP" | "USD" | "EUR"

interface CurrencyDefinition {
	/** Decimals shown when the amount is whole. */
	defaultFractionDigits: number
	symbol: Record<SupportedLocale, string>
}

/**
 * The symbol trails the amount in both languages. In an RTL paragraph the
 * bidi algorithm places the Latin-digit run first (visually rightmost), so
 * "1,234 ل.س." reads correctly without embedding any directional marks.
 * ⚠️ Not visually verified — see I18N-REPORT.md.
 */
const CURRENCIES: Record<CurrencyCode, CurrencyDefinition> = {
	SYP: { defaultFractionDigits: 0, symbol: { ar: "ل.س.", en: "SYP" } },
	USD: { defaultFractionDigits: 2, symbol: { ar: "$", en: "$" } },
	EUR: { defaultFractionDigits: 2, symbol: { ar: "€", en: "€" } }
}

export const DEFAULT_CURRENCY: CurrencyCode = "SYP"

export interface CurrencyFormatOptions extends Pick<NumberFormatOptions, "grouping"> {
	currency?: CurrencyCode
	locale?: SupportedLocale
	/**
	 * Force a decimal count.
	 *
	 * Left unset, the formatter picks per value:
	 *   • whole amount   → the currency's default (0 for SYP)
	 *   • has a fraction → the fraction is PRESERVED, not rounded away
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

	// Only round when told to, or when there is nothing to lose by rounding.
	const digits = fractionDigits ?? (hasFraction(value) ? undefined : definition.defaultFractionDigits)

	const amount = formatNumber(value, { fractionDigits: digits, grouping })

	return showSymbol ? `${amount} ${definition.symbol[locale]}` : amount
}
