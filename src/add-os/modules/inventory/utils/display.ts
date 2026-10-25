import type { Bilingual, CustodianDescription, PlaceDescription } from "@/add-os/modules/inventory/types/inventory"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { formatCurrency, formatNumber, isCurrencyCode } from "@/add-os/utils/format"

/** Shown where a value is missing: a mark, not a word, so it needs no translation. */
export const EMPTY = "—"

/** A bilingual value in the current language, falling back to the other one (English is optional on the backend). */
export function localized(value: Bilingual | null | undefined): string {
	if (!value) return ""
	const primary = currentLocale.value === "en" ? value.en : value.ar
	return primary || value.ar || value.en || ""
}

/** "Room 3 · Aleppo › Tower A › Floor 2" — the place, then where it sits. */
export function placeLabel(place: PlaceDescription | null | undefined): string {
	if (!place) return EMPTY
	const name = place.label ?? `#${place.id}`
	return place.path.length ? `${name} · ${place.path.join(" › ")}` : name
}

export function custodianLabel(custodian: CustodianDescription | null | undefined): string {
	if (!custodian) return EMPTY
	return custodian.label ?? `#${custodian.id}`
}

/** A quantity the server sent as a plain string ("12", "1.5"), as it is. */
export function quantity(value: string | number | null | undefined): string {
	return value === null || value === undefined || value === "" ? EMPTY : formatNumber(value, { trimZeros: true })
}

/** An amount in its own currency, never converted; a code the dashboard does not know is printed beside the number. */
export function money(amount: string | number | null | undefined, currency: string | null | undefined): string {
	if (amount === null || amount === undefined || amount === "") return EMPTY
	if (currency && isCurrencyCode(currency)) return formatCurrency(amount, { currency })
	return currency ? `${formatNumber(amount, { trimZeros: true })} ${currency}` : formatNumber(amount, { trimZeros: true })
}
