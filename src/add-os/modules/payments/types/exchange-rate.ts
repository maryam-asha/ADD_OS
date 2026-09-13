export interface ExchangeRate {
	id: number
	currency_code: string
	/** Decimal string — rate to base currency. */
	rate_to_base: string
	market_rate?: number
	display_rate?: string
	effective_from: string
	set_by: number | null
	created_at: string
}

/**
 * List + Create only — GET/PUT/DELETE on a single id all 404 live (confirmed:
 * an immutable rate ledger by design, not a missing feature). `currency_code`
 * only ever accepts "USD" (SYP/EUR/GBP/TRY/SAR all rejected as 422 invalid) —
 * SYP is the fixed base currency the rate converts into.
 */
export interface ExchangeRatePayload extends Record<string, unknown> {
	currency_code: string
	rate_to_base: number
	effective_from: string
	suggestion_id?: number | null
}

export interface ExchangeRateSuggestion {
	id: number | null
	rate_usd_to_syp: string | null
	suggested_rate_to_base: number | null
	source: string | null
	fetched_at: string | null
	deviation_percent: number | null
	source_stale: boolean
	last_successful_fetch_at: string | null
}

