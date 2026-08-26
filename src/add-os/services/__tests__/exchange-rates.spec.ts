import type { ExchangeRate, ExchangeRateSuggestionResponse } from "@/add-os/modules/payments/types/exchange-rate"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { createExchangeRate, dismissExchangeRateSuggestion, getExchangeRateSuggestion, listExchangeRates } from "../exchange-rates"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

/**
 * `currency_code: "SYP"` and a tiny `rate_to_base`, where this fixture used to
 * carry `"USD"` and `14800`.
 *
 * Both halves changed for the same reason and neither is cosmetic: ADDCore's
 * multi-currency migration made USD the BASE currency, which
 * `StoreExchangeRateRequest` explicitly excludes, and `rate_to_base` is USD per
 * 1 unit of `currency_code` — so a real SYP row holds ~0.000068, not ~14,800.
 * A fixture in the old shape would have kept this suite green over a contract
 * that no longer exists.
 */
const sampleRate: ExchangeRate = {
	id: 2,
	currency_code: "SYP",
	rate_to_base: "0.0000680272",
	effective_from: "2026-08-19T00:00:00.000000Z",
	set_by: 1,
	created_at: "2026-08-20T15:18:28.000000Z"
}

const pendingSuggestion: ExchangeRateSuggestionResponse = {
	id: 7,
	rate_usd_to_syp: "14700.0000",
	suggested_rate_to_base: 0.000068027,
	source: "sp_today",
	fetched_at: "2026-08-26T09:00:00Z",
	deviation_percent: 3.2,
	source_stale: false,
	last_successful_fetch_at: "2026-08-26T09:00:00Z"
}

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("exchange-rates service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("listExchangeRates GETs the collection and unwraps it", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleRate] }))

		const rates = await listExchangeRates()

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/exchange-rates", expect.objectContaining({ method: "GET" }))
		expect(rates).toEqual([sampleRate])
	})

	it("createExchangeRate POSTs the payload and unwraps the created resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleRate }, 201))

		const payload = { currency_code: "SYP", rate_to_base: 0.000068027, effective_from: "2026-08-19T00:00:00Z" }
		const rate = await createExchangeRate(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/exchange-rates",
			expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
		)
		expect(rate).toEqual(sampleRate)
	})

	it("puts suggestion_id on the wire when one is accepted, and omits it otherwise", async () => {
		// A fresh Response per call: a `Response` body can only be read once, and
		// `mockResolvedValue` would hand the same instance to both requests.
		vi.mocked(fetch).mockImplementation(async () => jsonResponse({ data: sampleRate }, 201))

		await createExchangeRate({ currency_code: "SYP", rate_to_base: 0.000068027, effective_from: "2026-08-26T00:00:00Z", suggestion_id: 7 })
		expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body))).toMatchObject({ suggestion_id: 7 })

		await createExchangeRate({ currency_code: "SYP", rate_to_base: 0.000068027, effective_from: "2026-08-26T00:00:00Z" })
		expect(JSON.parse(String(vi.mocked(fetch).mock.calls[1][1]?.body))).not.toHaveProperty("suggestion_id")
	})

	it("propagates ApiError on a 422", async () => {
		vi.mocked(fetch).mockResolvedValue(
			jsonResponse({ message: "البيانات المُرسلة غير صالحة.", errors: { currency_code: ["invalid"] } }, 422)
		)

		await expect(createExchangeRate({ currency_code: "USD", rate_to_base: 1, effective_from: "2026-01-01T00:00:00Z" })).rejects.toMatchObject({
			status: 422
		})
	})

	describe("suggestion", () => {
		/**
		 * Unwrapped on purpose: `ExchangeRateSuggestionController::show()` returns
		 * a bare `response()->json([...])`, not a JsonResource, so there is no
		 * `{data}` envelope to peel — unlike every resource endpoint above it.
		 */
		it("getExchangeRateSuggestion GETs the flat object with no data envelope", async () => {
			vi.mocked(fetch).mockResolvedValue(jsonResponse(pendingSuggestion))

			const suggestion = await getExchangeRateSuggestion()

			expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/exchange-rates/suggestion", expect.objectContaining({ method: "GET" }))
			expect(suggestion).toEqual(pendingSuggestion)
		})

		it("returns the all-null shape rather than 404ing when nothing is pending", async () => {
			const empty = { ...pendingSuggestion, id: null, rate_usd_to_syp: null, suggested_rate_to_base: null, source: null, fetched_at: null, deviation_percent: null }
			vi.mocked(fetch).mockResolvedValue(jsonResponse(empty))

			await expect(getExchangeRateSuggestion()).resolves.toMatchObject({ id: null })
		})

		it("dismissExchangeRateSuggestion POSTs to the id's dismiss route with no body", async () => {
			vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Suggestion dismissed." }))

			await dismissExchangeRateSuggestion(7)

			expect(fetch).toHaveBeenCalledWith(
				"http://api.test/api/v1/admin/exchange-rates/suggestion/7/dismiss",
				expect.objectContaining({ method: "POST", body: undefined })
			)
		})

		/** Raised when someone else accepted or dismissed it first. */
		it("propagates a 422 when the suggestion is no longer pending", async () => {
			vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "This suggestion is no longer pending." }, 422))

			await expect(dismissExchangeRateSuggestion(7)).rejects.toMatchObject({ status: 422 })
		})
	})
})
