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
export type PaymentMethod = "cash"

export const PAYMENT_METHODS: readonly PaymentMethod[] = ["cash"]

export interface WalletTopUp {
	id: number
	transaction_code?: string
	/**
	 * Points actually credited to the wallet — the authoritative figure, and a
	 * whole integer. The cash keys below record what was paid; this records
	 * what was bought, and the two only agree via the server's rate.
	 */
	points_credited: number
	/** Wallet balance in whole points before this top-up. */
	previous_balance_points: number
	/** Wallet balance in whole points after this top-up. */
	new_balance_points: number
	/**
	 * USD value of one point at the moment of the top-up, as a decimal string,
	 * e.g. "0.1000". Recorded per-transaction because an admin can change the
	 * rate: it is an audit value, not a conversion factor to reuse.
	 */
	point_rate_usd: string
	/**
	 * Decimal string as returned by the API, e.g. "50.00". Legacy USD view of
	 * `points_credited`, kept additively by the backend and derived from the
	 * stored point value, so the two always agree.
	 */
	amount: string
	currency?: string
	payment_amount?: string
	payment_currency?: string
	exchange_rate?: string | null
	source: string
	payment_method: PaymentMethod
	description?: string | null
	performed_by_user_id: number
	performed_by_name?: string
	owner_type?: "user" | "company"
	owner_id?: number
	recipient_name?: string
	recipient_phone?: string | null
	previous_balance?: string
	new_balance?: string
	created_at?: string
}

export interface WalletBalanceResponse {
	owner_type: "user" | "company"
	owner_id: number
	owner_name: string
	owner_phone: string | null
	status?: string
	/**
	 * The wallet's general balance in whole points — the authoritative figure,
	 * and what the UI shows first. Everything below is the server's own
	 * rendering of this same number, never a client-side conversion of it.
	 */
	balance_points: number
	/** `balance_points` in USD, decimal string e.g. "34.00". */
	balance_usd: string
	/** `balance_points` in `display_currency`, decimal string. */
	balance_display: string
	general_balance: string
	currency: string
	converted_balance?: string | null
	display_currency?: string
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
	currency?: string
	payment_method: PaymentMethod
	/** Optional, max 255 server-side. `null` when the operator left it blank. */
	description: string | null
} & ({ user_id: number } | { company_id: number })

/**
 * Response of `POST .../wallet-top-ups/preview` — what the operator's cash
 * would buy, computed by the server and never by this client.
 *
 * The preview exists precisely so the dialog does not have to divide by the
 * point rate itself: rounding is a ceil-once rule that lives in the backend's
 * PointConversionService, and a second implementation here would drift the
 * moment an admin edits the rate. Ask, don't compute.
 *
 * A payment too small to buy one whole point is a 422 from this endpoint
 * (`api.wallet.amount_below_one_point`), not a zero-point success.
 */
export interface WalletTopUpPreview {
	/** Whole points the payment would credit. */
	points: number
	/** USD value of those points, decimal string, e.g. "50.00". */
	usd: string
	/** Cash echoed back as the server parsed it, decimal string. */
	payment_amount: string
	/** ISO code `payment_amount` is denominated in. */
	payment_currency: string
	/** USD value of one point used for this quote, e.g. "0.1000". */
	point_rate_usd: string
}

/**
 * Preview takes the same body as the create call minus the bookkeeping-only
 * `description`, so the quote reflects exactly the payment about to be made.
 */
export type WalletTopUpPreviewPayload = {
	amount: string
	currency?: string
	payment_method: PaymentMethod
} & ({ user_id: number } | { company_id: number })
