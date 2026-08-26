// src/add-os/modules/payments/types/exchange-rate.ts

export interface ExchangeRate {
	id: number
	/**
	 * WAS typed `"USD"`. Widened to `string` on 2026-08-26 — see the reversal
	 * note on `ExchangeRatePayload` below.
	 */
	currency_code: string
	/**
	 * Decimal string — units of the BASE currency (USD) per 1 unit of
	 * `currency_code`. For SYP that is a tiny value like "0.0000680272", not a
	 * five-figure one.
	 *
	 * This doc comment previously read "SYP per 1 USD", which is the reciprocal
	 * and the exact mistake ADDCore's own `StoreExchangeRateRequest` added a
	 * 10x plausibility band to catch. Corrected against
	 * `docs/decisions/multi-currency-support.md` ("units of the base currency
	 * per 1 unit of `currency_code`") and the `decimal(20,10)` column that holds
	 * it. Render it with `formatNumber`'s default precision — a fixed
	 * `fractionDigits: 4` rounds a real SYP rate to "0.0001".
	 */
	rate_to_base: string
	effective_from: string
	set_by: number
	created_at: string
}

/**
 * List + Create only — GET/PUT/DELETE on a single id all 404 live (confirmed:
 * an immutable rate ledger by design, not a missing feature).
 *
 * ── ORIGINAL NOTE, kept for the record ──────────────────────────────────────
 * "`currency_code` only ever accepts "USD" (SYP/EUR/GBP/TRY/SAR all rejected as
 * 422 invalid) — SYP is the fixed base currency the rate converts into."
 *
 * ── REVERSAL, 2026-08-26 ────────────────────────────────────────────────────
 * That was true when it was measured and is false now; the direction is
 * INVERTED, not merely widened. ADDCore's multi-currency migration
 * (`2026_08_20_100000_create_currencies_table`, resolved in
 * `docs/decisions/multi-currency-support.md`) seeds **USD as `is_base = true`**,
 * and `StoreExchangeRateRequest` now validates
 * `Rule::exists('currencies','code')->where(is_active = true, is_base = false)`
 * — so "USD" is the one code that is now REJECTED, and "SYP" is accepted. The
 * base currency never gets a row here at all: its rate to itself is
 * definitionally 1.
 *
 * What that costs: `currency_code` can no longer be a compile-time literal
 * union, because the valid set is a database table an admin edits through
 * `CurrenciesPage`. The set is enforced at runtime instead — the create form's
 * options come from `GET /admin/currencies` filtered to active, non-base rows,
 * which is the same predicate the server validates against. A literal union
 * would have to be re-edited every time someone adds a currency, which is the
 * thing that migration existed to stop.
 *
 * Verified against ADDCore source, not the pinned API snapshot: the snapshot
 * (2026-08-25, `sha256 86d330d9…`) still describes the pre-migration contract
 * and has no `currencies` endpoints at all. See `docs/api/UNPINNED-ENDPOINTS.md`.
 */
export interface ExchangeRatePayload extends Record<string, unknown> {
	currency_code: string
	/** USD per 1 unit of `currency_code` — the tiny decimal, never the SYP-per-USD figure. */
	rate_to_base: number
	effective_from: string
	/**
	 * Present ONLY when this submission is accepting a pending suggestion.
	 *
	 * It is what makes `ExchangeRateController::store()` mark that suggestion
	 * `accepted` and stamp the new row `source = external_accepted` instead of
	 * `manual`. Without it the accept silently degrades into an unrelated manual
	 * rate that merely happens to carry similar numbers, and the suggestion stays
	 * pending — so the banner never clears.
	 */
	suggestion_id?: number
}

/**
 * `GET /api/v1/admin/exchange-rates/suggestion` — always 200, no params, never a
 * 404. Every field except `source_stale` is `null` when nothing is pending.
 *
 * A third-party quote (sp-today) shown next to the current rate for an admin to
 * review. It is a suggestion and never an authority: the external source never
 * writes `exchange_rates` itself and never bypasses the admin who accepts it
 * (`docs/decisions/exchange-rate-external-suggestion.md`).
 */
export interface ExchangeRateSuggestionResponse {
	/** `null` when no suggestion is pending — the banner renders nothing at all. */
	id: number | null
	/**
	 * Decimal string, SYP per 1 USD — sp-today's number exactly as quoted (e.g.
	 * "14700.0000000000"). This is the human-readable figure an admin
	 * recognises, and it is DISPLAY ONLY. It is never what gets submitted.
	 */
	rate_usd_to_syp: string | null
	/**
	 * The number that IS submitted, as `rate_to_base`. A JSON float, already
	 * inverted server-side (`1 / rate_usd_to_syp`) — read it directly and never
	 * recompute it from `rate_usd_to_syp` on the client. The backend's own
	 * comment says why: "rate_to_base is USD-per-1-SYP, rate_usd_to_syp is
	 * SYP-per-1-USD", and getting that backwards is off by four orders of
	 * magnitude.
	 */
	suggested_rate_to_base: number | null
	/** The vendor that quoted it — a machine token (`sp_today` today), not a phrase. */
	source: string | null
	fetched_at: string | null
	/**
	 * Signed percentage against the currently active rate, already converted to
	 * a common direction server-side. `null` when nothing is pending OR when no
	 * current effective rate exists to compare against.
	 */
	deviation_percent: number | null
	/** True when nothing has been fetched in 48h — computed across every suggestion, not just the pending one. */
	source_stale: boolean
	last_successful_fetch_at: string | null
}

/** The same response once `id` is known present — what the banner renders from. */
export interface PendingExchangeRateSuggestion extends ExchangeRateSuggestionResponse {
	id: number
	rate_usd_to_syp: string
	suggested_rate_to_base: number
}

/**
 * `id` is the single discriminator the endpoint offers: `show()` fills every
 * other field from the same `$suggestion?->…` optional chain, so they are all
 * non-null exactly when it is.
 */
export function hasPendingSuggestion(response: ExchangeRateSuggestionResponse | null): response is PendingExchangeRateSuggestion {
	return response !== null && response.id !== null && response.rate_usd_to_syp !== null && response.suggested_rate_to_base !== null
}
