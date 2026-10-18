import { formatCurrency, formatNumber, isCurrencyCode } from "@/add-os/utils/format"

/**
 * An HR amount: a decimal string (never parsed to float) in the currency the
 * server names. A currency the dashboard does not know still shows its digits
 * and its code rather than a wrong symbol.
 */
export function money(amount: string, currency: string): string {
	return isCurrencyCode(currency) ? formatCurrency(amount, { currency }) : `${formatNumber(amount)} ${currency}`
}
