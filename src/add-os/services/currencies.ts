import type { MessageResponse } from "./resource-factory"
import type { Currency, CurrencyCreatePayload, CurrencyUpdatePayload } from "@/add-os/modules/payments/types/currency"
import { get, patch, post } from "./api"
import { rowsOf } from "./pagination"

/**
 * Hand-rolled rather than `createResourceApi`: `CurrencyController` is
 * explicitly not a 5-verb `apiResource`. It is keyed by a string `code`, not
 * a numeric id; it uses PATCH where the factory uses PUT; it has no `destroy`
 * (a currency deactivates, it never hard-deletes — plans, spaces, bookings
 * and users all carry a real FK to `currencies.code`); and status and base
 * are separate single-purpose actions rather than fields on update.
 *
 * Endpoints read from ADD Core `routes/api/v1/admin.php`. They carry no
 * per-route permission or role middleware — the same finance-admin tier as
 * `exchange-rates` above them in that file — which is why the page gates
 * nothing with `can()`.
 */
const BASE = "/api/v1/admin/currencies"

export async function listCurrencies(): Promise<Currency[]> {
	const res = await get<{ data: Currency[] }>(BASE)
	return rowsOf<Currency>(res.data)
}

export async function createCurrency(payload: CurrencyCreatePayload): Promise<Currency> {
	const res = await post<{ data: Currency }>(BASE, payload)
	return res.data
}

/** Returns `{"message": "..."}`, never the updated resource — callers refetch. */
export function updateCurrency(code: string, payload: CurrencyUpdatePayload): Promise<MessageResponse> {
	return patch<MessageResponse>(`${BASE}/${code}`, payload)
}

/**
 * Deactivating the base currency is refused server-side with a 422:
 * `CurrencyConversionService` and `CurrencyResolver` both depend on exactly
 * one always-active base row. The page hides the control on that row rather
 * than letting the user click into a guaranteed rejection.
 */
export function setCurrencyStatus(code: string, isActive: boolean): Promise<MessageResponse> {
	return patch<MessageResponse>(`${BASE}/${code}/status`, { is_active: isActive })
}

/**
 * Reassigns which currency is the conversion base. The code in the path is
 * the entire request, so no body is sent.
 *
 * **Not on master yet** — this ships with a separate backend batch, and until
 * it lands the call 404s. That is expected, not a defect to chase.
 *
 * Note for whoever lands it: it reverses a documented decision. ADD Core's
 * `docs/decisions/multi-currency-support.md` states the base currency is
 * "fixed via `is_base`, not user-configurable", `StoreCurrencyRequest` says it
 * is "fixed forever to the one seeded USD row", and
 * `tests/Guards/ExactlyOneBaseCurrencyTest.php` asserts the base row's code is
 * literally `'USD'`. That guard fails the first time a reassignment actually
 * happens and needs updating in the same batch.
 */
export function setBaseCurrency(code: string): Promise<MessageResponse> {
	return patch<MessageResponse>(`${BASE}/${code}/base`)
}
