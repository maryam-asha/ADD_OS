export interface ExchangeRate {
	id: number
	currency_code: "USD"
	/** Decimal string — SYP per 1 USD. */
	rate_to_base: string
	effective_from: string
	set_by: number
	created_at: string
}

/**
 * List + Create only — GET/PUT/DELETE on a single id all 404 live (confirmed:
 * an immutable rate ledger by design, not a missing feature). `currency_code`
 * only ever accepts "USD" (SYP/EUR/GBP/TRY/SAR all rejected as 422 invalid) —
 * SYP is the fixed base currency the rate converts into.
 */
export interface ExchangeRatePayload extends Record<string, unknown> {
	currency_code: "USD"
	rate_to_base: number
	effective_from: string
}
