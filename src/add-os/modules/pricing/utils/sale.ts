export type SaleKey = "sale_hourly_rate_points" | "sale_price_points"
export type SaleState = "running" | "scheduled" | "ended" | "none"

const TIME_KEYS = ["sale_starts_at", "sale_ends_at"] as const

function emptyToNull(value: unknown): unknown {
	return value === "" || value === undefined ? null : value
}

/**
 * The three sale fields, ready to send: an empty input becomes `null` and
 * no key is ever dropped. All three `null` ends a running sale (a no-op
 * when there is none); a partial fill goes as it is so the server's
 * `required_with` error lands on the field that is missing.
 */
export function normalizeSale<T extends Record<string, unknown>>(payload: T, saleKey: SaleKey): T {
	const out: Record<string, unknown> = { ...payload }
	out[saleKey] = emptyToNull(out[saleKey])
	for (const key of TIME_KEYS) out[key] = emptyToNull(out[key])
	return out as T
}

/** Where a sale's window stands — a status from two dates, never a price. */
export function saleState(startsAt: string | null, endsAt: string | null, now: Date = new Date()): SaleState {
	if (!startsAt || !endsAt) return "none"
	const time = now.getTime()
	if (time < Date.parse(startsAt)) return "scheduled"
	if (time < Date.parse(endsAt)) return "running"
	return "ended"
}
