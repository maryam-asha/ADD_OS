import type { Currency } from "@/add-os/modules/payments/types/currency"
import type { PendingExchangeRateSuggestion } from "@/add-os/modules/payments/types/exchange-rate"
import { describe, expect, it } from "vitest"

import { hasPendingSuggestion } from "@/add-os/modules/payments/types/exchange-rate"
import {
	emptyExchangeRatePayload,
	latestRatesByCurrency,
	selectableRateCurrencies,
	SUGGESTION_CURRENCY_CODE,
	suggestionExchangeRatePayload,
	todayEffectiveFrom
} from "../exchange-rates.config"

function currency(code: string, overrides: Partial<Currency> = {}): Currency {
	return {
		code,
		name: { ar: code, en: code },
		symbol: null,
		decimal_places: 2,
		is_base: false,
		is_active: true,
		order: null,
		created_at: "",
		...overrides
	}
}

describe("latestRatesByCurrency", () => {
	it("picks the row with the latest effective_from per currency", () => {
		const rates = [
			{ id: 1, currency_code: "SYP", rate_to_base: "0.0000689655", effective_from: "2026-08-17T00:00:00.000000Z", set_by: 1, created_at: "" },
			{ id: 2, currency_code: "SYP", rate_to_base: "0.0000675676", effective_from: "2026-08-19T00:00:00.000000Z", set_by: 1, created_at: "" }
		]

		expect(latestRatesByCurrency(rates)).toEqual([rates[1]])
	})

	it("breaks a tied effective_from by the highest id — matches the one tied case observed live", () => {
		const rates = [
			{ id: 2, currency_code: "SYP", rate_to_base: "0.0000675676", effective_from: "2026-08-19T00:00:00.000000Z", set_by: 1, created_at: "" },
			{ id: 3, currency_code: "SYP", rate_to_base: "0.0000666667", effective_from: "2026-08-19T00:00:00.000000Z", set_by: 1, created_at: "" }
		]

		expect(latestRatesByCurrency(rates)).toEqual([rates[1]])
	})

	it("returns one entry per distinct currency_code", () => {
		const rates = [
			{ id: 1, currency_code: "SYP", rate_to_base: "0.0000689655", effective_from: "2026-08-17T00:00:00.000000Z", set_by: 1, created_at: "" },
			{ id: 2, currency_code: "TRY", rate_to_base: "0.0295", effective_from: "2026-08-17T00:00:00.000000Z", set_by: 1, created_at: "" }
		]

		expect(latestRatesByCurrency(rates)).toHaveLength(2)
	})

	it("returns an empty array for an empty input", () => {
		expect(latestRatesByCurrency([])).toEqual([])
	})
})

/**
 * Mirrors `StoreExchangeRateRequest`'s own predicate:
 * `Rule::exists('currencies','code')->where(is_active = true, is_base = false)`.
 * The base currency never gets a rate row — its rate to itself is 1 — and an
 * inactive one is refused outright.
 */
describe("selectableRateCurrencies", () => {
	it("keeps active non-base currencies", () => {
		expect(selectableRateCurrencies([currency("SYP"), currency("TRY")]).map(c => c.code)).toEqual(["SYP", "TRY"])
	})

	it("drops the base currency even while it is active", () => {
		expect(selectableRateCurrencies([currency("USD", { is_base: true }), currency("SYP")]).map(c => c.code)).toEqual(["SYP"])
	})

	it("drops an inactive currency", () => {
		expect(selectableRateCurrencies([currency("EUR", { is_active: false })])).toEqual([])
	})
})

describe("emptyExchangeRatePayload", () => {
	it("preselects the only selectable code", () => {
		expect(emptyExchangeRatePayload([currency("USD", { is_base: true }), currency("SYP")]).currency_code).toBe("SYP")
	})

	it("leaves the choice to the operator once more than one is selectable", () => {
		expect(emptyExchangeRatePayload([currency("SYP"), currency("TRY")]).currency_code).toBe("")
	})

	it("holds no code at all when the currencies list never arrived", () => {
		expect(emptyExchangeRatePayload().currency_code).toBe("")
	})

	it("carries no suggestion_id — a manual entry is not an accept", () => {
		expect(emptyExchangeRatePayload([currency("SYP")])).not.toHaveProperty("suggestion_id")
	})
})

describe("suggestionExchangeRatePayload", () => {
	const suggestion: PendingExchangeRateSuggestion = {
		id: 7,
		rate_usd_to_syp: "14700.0000",
		suggested_rate_to_base: 0.000068027,
		source: "sp_today",
		fetched_at: "2026-08-26T09:00:00Z",
		deviation_percent: 3.2,
		source_stale: false,
		last_successful_fetch_at: "2026-08-26T09:00:00Z"
	}

	/**
	 * The direction problem, asserted directly. `rate_usd_to_syp` is SYP per 1
	 * USD and `rate_to_base` is its reciprocal; the backend already inverted it,
	 * and copying the wrong field is off by four orders of magnitude.
	 */
	it("copies suggested_rate_to_base verbatim and never the quoted market rate", () => {
		const payload = suggestionExchangeRatePayload(suggestion)

		expect(payload.rate_to_base).toBe(0.000068027)
		expect(payload.rate_to_base).not.toBe(14700)
	})

	it("does not recompute the value from rate_usd_to_syp", () => {
		const skewed = { ...suggestion, suggested_rate_to_base: 0.5 }

		expect(suggestionExchangeRatePayload(skewed).rate_to_base).toBe(0.5)
	})

	it("pins the currency to the one a suggestion is valid against", () => {
		expect(suggestionExchangeRatePayload(suggestion).currency_code).toBe(SUGGESTION_CURRENCY_CODE)
		expect(SUGGESTION_CURRENCY_CODE).toBe("SYP")
	})

	it("pre-fills effective_from with today", () => {
		expect(suggestionExchangeRatePayload(suggestion, new Date("2026-08-26T09:00:00Z")).effective_from).toBe("2026-08-26")
	})

	/** It is merged at submit from the page's own state — see `ExchangeRatesPage.submit`. */
	it("leaves suggestion_id out of the form model", () => {
		expect(suggestionExchangeRatePayload(suggestion)).not.toHaveProperty("suggestion_id")
	})
})

/**
 * UTC, not local. The page appends `T00:00:00Z`, so a local date taken just
 * after midnight in Damascus (UTC+3) would name tomorrow and produce an instant
 * three hours in the future, which `ExchangeRate::current()` skips until it
 * arrives.
 */
describe("todayEffectiveFrom", () => {
	it("takes the UTC date, not the local one", () => {
		expect(todayEffectiveFrom(new Date("2026-08-26T22:30:00Z"))).toBe("2026-08-26")
		expect(todayEffectiveFrom(new Date("2026-08-27T00:30:00Z"))).toBe("2026-08-27")
	})
})

describe("hasPendingSuggestion", () => {
	const pending = {
		id: 7,
		rate_usd_to_syp: "14700.0000",
		suggested_rate_to_base: 0.000068027,
		source: "sp_today",
		fetched_at: "2026-08-26T09:00:00Z",
		deviation_percent: 3.2,
		source_stale: false,
		last_successful_fetch_at: "2026-08-26T09:00:00Z"
	}

	it("accepts a filled response", () => {
		expect(hasPendingSuggestion(pending)).toBe(true)
	})

	it("rejects the all-null response the endpoint returns when nothing is pending", () => {
		expect(
			hasPendingSuggestion({
				...pending,
				id: null,
				rate_usd_to_syp: null,
				suggested_rate_to_base: null,
				source: null,
				fetched_at: null,
				deviation_percent: null
			})
		).toBe(false)
	})

	it("rejects a null response", () => {
		expect(hasPendingSuggestion(null)).toBe(false)
	})

	/** A pending row with a stale source is still pending — the banner switches state, it does not vanish. */
	it("still accepts a pending suggestion whose source has gone stale", () => {
		expect(hasPendingSuggestion({ ...pending, source_stale: true })).toBe(true)
	})
})
