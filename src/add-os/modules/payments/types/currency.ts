// src/add-os/modules/payments/types/currency.ts

/**
 * The admin-managed currency lookup that replaced ADDCore's hardcoded
 * `App\Domain\Finance\Enums\Currency` two-case enum on 2026-08-20 — a new
 * currency lands through this dashboard, not a code deploy.
 *
 * SOURCE NOTE, read this before citing anything here: unlike every other
 * resource in this codebase, these endpoints are **absent from the API
 * snapshot pinned 2026-08-25** (`docs/api/ADD-OS.postman_collection.json`,
 * `sha256 86d330d9…`) — `pnpm api:collection:check` reports MATCH, so the
 * canonical collection genuinely has no record of them either. The shapes
 * below are therefore read from ADDCore source directly:
 * `routes/api/v1/admin.php`, `CurrencyController`, `CurrencyResource`,
 * `StoreCurrencyRequest`/`UpdateCurrencyRequest`/`UpdateCurrencyStatusRequest`,
 * and `docs/decisions/multi-currency-support.md`. See
 * `docs/api/UNPINNED-ENDPOINTS.md`.
 *
 * The primary key is `code`, a client-supplied 3-letter string — there is no
 * autoincrement id anywhere on this resource. That rules out
 * `createResourceApi()` (whose routes are built from `{id: number}`) and
 * `ResourceTable` (whose generic is `T extends { id: number }`); see
 * `services/currencies.ts` and `views/CurrenciesPage.vue` for what each uses
 * instead.
 */
export interface Currency {
	/** Immutable primary key — exactly three uppercase letters. */
	code: string
	name: { ar: string; en: string }
	symbol: string | null
	decimal_places: number
	/**
	 * Exactly one row carries `true` (seeded USD) and it can never be
	 * deactivated: `CurrencyController::updateStatus()` answers 422
	 * `api.currency.base_currency_status_locked` for it, because
	 * `CurrencyConversionService`/`CurrencyResolver` both assume one
	 * always-active base row exists. Never settable through any endpoint.
	 */
	is_base: boolean
	is_active: boolean
	order: number | null
	created_at: string
}

/**
 * The create form's shape. Extends `Record<string, unknown>` so it is
 * structurally assignable to `ResourceFormDrawer`'s
 * `TModel extends Record<string, unknown>` generic (same reason as
 * `PlanPayload`).
 *
 * `is_active` and `is_base` are deliberately absent rather than defaulted:
 * `CurrencyController::store()` fixes them itself (`is_active: true`,
 * `is_base: false`), status is a separate endpoint, and `is_base` is not
 * settable through the API at all. Sending `is_active` would actually take
 * effect — `store()` merges `$request->validated()` *over* its own defaults —
 * which is exactly why this shape has no way to express it.
 *
 * `symbol` is a plain string, not `string | null`: an untouched text input
 * holds `""`. The service owns the one conversion to `null` on the wire.
 */
export interface CurrencyPayload extends Record<string, unknown> {
	code: string
	name: { ar: string; en: string }
	symbol: string
	decimal_places: number
	order: number | null
}

/**
 * `UpdateCurrencyRequest` accepts everything the create does except `code`.
 *
 * Spelled out rather than written as `Omit<CurrencyPayload, "code">`: because
 * `CurrencyPayload` carries an index signature, `keyof` it is `string | number`,
 * so `Omit` collapses the whole thing to a bare `{[k: string]: unknown}` and
 * every named field silently loses its type.
 */
export interface CurrencyUpdatePayload extends Record<string, unknown> {
	name: { ar: string; en: string }
	symbol: string
	decimal_places: number
	order: number | null
}

/** Body of `PATCH /admin/currencies/{code}/status` — this one key, nothing else. */
export interface CurrencyStatusPayload extends Record<string, unknown> {
	is_active: boolean
}
