/**
 * Manual wallet top-up recorded at reception.
 *
 * Shape is literal from the canonical collection's
 * `Admin (Dashboard) → Reception Operations → Wallet Top-up` folder, read
 * directly on 2026-08-24 — NOT from `docs/api/ADD-OS.postman_collection.json`,
 * whose pin was stale at the time (`pnpm api:collection:check` reported
 * MISMATCH). The two agree byte-for-byte on this endpoint; the citation names
 * the canonical read because that is what was actually verified.
 *
 * The collection carries no example response for any of the three requests, so
 * `WalletTopUp` below is the 201 body as specified by the backend task, not an
 * observed one. Treat it as unconfirmed until one real response is captured.
 */

/** `App\Domain\Finance\Enums\PaymentMethod` — exact wire strings, not labels. */
export type PaymentMethod = "cash" | "sham" | "mtn" | "syriatel"

export const PAYMENT_METHODS: readonly PaymentMethod[] = ["cash", "sham", "mtn", "syriatel"]

export interface WalletTopUp {
	id: number
	/** Decimal string as returned by the API, e.g. "50.00" — see `Plan.price`. */
	amount: string
	source: string
	payment_method: PaymentMethod
	performed_by_user_id: number
}

/**
 * `user_id` and `company_id` are mutually exclusive: sending both, or neither,
 * is a 422 ("exactly one of user_id/company_id is required"). Modelling that as
 * a union rather than two optional fields means the impossible payload cannot be
 * constructed at all — the page builds one arm or the other, never a merge of a
 * form model that still holds both.
 *
 * `amount` is a STRING, deliberately. The backend column is DECIMAL, and
 * `utils/format/numbers.ts` documents why a JS `number` is the lossy step: it
 * happens before any formatter can help. The form binds a text input and passes
 * the operator's digits through untouched.
 */
export type WalletTopUpPayload = {
	amount: string
	payment_method: PaymentMethod
	/** Optional, max 255 server-side. `null` when the operator left it blank. */
	description: string | null
} & ({ user_id: number } | { company_id: number })
