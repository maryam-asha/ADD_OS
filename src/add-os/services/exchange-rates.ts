import type { MessageResponse } from "./resource-factory"
import type { ExchangeRate, ExchangeRatePayload, ExchangeRateSuggestionResponse } from "@/add-os/modules/payments/types/exchange-rate"
import { get, post } from "./api"

const BASE = "/api/v1/admin/exchange-rates"

export async function listExchangeRates(): Promise<ExchangeRate[]> {
	const res = await get<{ data: ExchangeRate[] }>(BASE)
	return res.data
}

/**
 * `payload.suggestion_id` is what turns this from a manual entry into an
 * accepted suggestion — it is the only difference between the two paths on the
 * wire. `ExchangeRateController::store()` re-locks and re-checks the suggestion
 * inside its own transaction before honouring it, so a 422 here can mean
 * "someone else accepted it a moment ago", not only "bad input".
 */
export async function createExchangeRate(payload: ExchangeRatePayload): Promise<ExchangeRate> {
	const res = await post<{ data: ExchangeRate }>(BASE, payload)
	return res.data
}

/**
 * Always 200 and never a 404, even with nothing pending — a flat object whose
 * `id` is `null` in that case. Not wrapped in `{data}` either, unlike every
 * resource endpoint above: `ExchangeRateSuggestionController::show()` returns a
 * bare `response()->json([...])`, not a JsonResource.
 *
 * Read from ADDCore source rather than the pinned API snapshot, which has no
 * record of this endpoint — see `docs/api/UNPINNED-ENDPOINTS.md`.
 */
export async function getExchangeRateSuggestion(): Promise<ExchangeRateSuggestionResponse> {
	return get<ExchangeRateSuggestionResponse>(`${BASE}/suggestion`)
}

/** No body, no form — one click. 422s if the suggestion is no longer pending. */
export async function dismissExchangeRateSuggestion(id: number): Promise<MessageResponse> {
	return post<MessageResponse>(`${BASE}/suggestion/${id}/dismiss`)
}
