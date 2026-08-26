import type { MessageResponse } from "./resource-factory"
import type { Currency, CurrencyPayload, CurrencyStatusPayload, CurrencyUpdatePayload } from "@/add-os/modules/payments/types/currency"
import { get, patch, post } from "./api"

const BASE = "/api/v1/admin/currencies"

/**
 * Hand-written rather than `createResourceApi()`, for one reason the factory
 * cannot bend to: every route it builds is `${base}/${id}` with `id: number`.
 * This resource's primary key is a client-supplied `code` STRING (`Currency`
 * has no numeric id at all), and its writes are `PATCH`, not the factory's
 * `PUT`. `services/companies.ts` is the existing precedent for a resource that
 * deviates from the generic five-verb shape.
 *
 * There is deliberately no `removeCurrency()`: no destroy route exists
 * (`routes/api/v1/admin.php` registers index/store/show/update/updateStatus
 * only) because plans, spaces, bookings and users all carry a real FK to
 * `currencies.code` with `restrictOnDelete()`. Deactivation via
 * `updateCurrencyStatus` IS the removal path.
 *
 * `GET /currencies/{code}` (`show`) exists server-side but has no caller here —
 * the list returns every field the detail route does, and the table already
 * holds the row. Not wrapped, so nothing ships unused.
 *
 * Endpoints read from ADDCore source, NOT from the pinned API snapshot, which
 * has no record of them — see the source note on `types/currency.ts`.
 */

/**
 * The key goes into a path segment, so it is encoded. `StoreCurrencyRequest`
 * constrains `code` to `/^[A-Z]{3}$/`, which makes this a no-op for every value
 * the API will accept — it is here because building a URL out of a
 * client-supplied string without encoding it is the habit worth not having,
 * not because a live code is expected to need it.
 */
function currencyPath(code: string, suffix = ""): string {
	return `${BASE}/${encodeURIComponent(code)}${suffix}`
}

/**
 * Not paginated, and that is the endpoint's own shape rather than a discarded
 * page: `CurrencyController::index()` returns
 * `Currency::query()->orderBy('order')->get()` — a plain resource collection
 * with no `meta` at all. The `order` sort is the server's; nothing re-sorts
 * client-side.
 */
export async function listCurrencies(): Promise<Currency[]> {
	const res = await get<{ data: Currency[] }>(BASE)
	return res.data
}

/**
 * The one place a form value becomes a wire value — same job, and the same
 * reason, as `toWirePayload` in `services/announcements.ts`.
 *
 * An empty optional symbol becomes `null` rather than `""`, so "this currency
 * has no symbol" is expressible from a text input the operator never touched
 * instead of being stored as a zero-length string.
 */
function toWireSymbol(symbol: string): string | null {
	const trimmed = symbol.trim()
	return trimmed === "" ? null : trimmed
}

export async function createCurrency(payload: CurrencyPayload): Promise<Currency> {
	const res = await post<{ data: Currency }>(BASE, { ...payload, symbol: toWireSymbol(payload.symbol) })
	return res.data
}

/** Returns `{message}`, never the updated resource — refetch for the new state. */
export async function updateCurrency(code: string, payload: CurrencyUpdatePayload): Promise<MessageResponse> {
	return patch<MessageResponse>(currencyPath(code), { ...payload, symbol: toWireSymbol(payload.symbol) })
}

/**
 * Separate endpoint, separate body — `is_active` is not part of the create or
 * edit form. Answers 422 for the base currency; `CurrenciesPage` never offers
 * the control on that row, so a live rejection here means something reached
 * past the UI.
 */
export async function updateCurrencyStatus(code: string, payload: CurrencyStatusPayload): Promise<MessageResponse> {
	return patch<MessageResponse>(currencyPath(code, "/status"), payload)
}
