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
	/** The rates, steps and minimum the top-up form converts with — see `TopUpConfig`. */
	top_up: TopUpConfig
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
	/**
	 * The whole points the form showed the operator. The server re-derives them
	 * from `amount` at its current rates and refuses a mismatch with a 422 on
	 * `points` — the form's arithmetic is a mirror, never the authority.
	 */
	points: number
	currency?: string
	payment_method: PaymentMethod
	/** Optional, max 255 server-side. `null` when the operator left it blank. */
	description: string | null
} & ({ user_id: number } | { company_id: number })

/** One currency the top-up form can quote in. */
export interface TopUpCurrency {
	code: string
	/** Units of the base currency per one unit of `code`, decimal string ("1" for the base itself). */
	rate_to_base: string
	/** The smallest amount the till takes in this currency, decimal string, e.g. "1.00". */
	cash_step: string
	decimal_places: number
}

/**
 * `wallet-balance`'s `top_up` block: everything the form needs to convert
 * points ↔ cash without asking the server on every keystroke (ADDCore spec
 * 2026-10-10-wallet-top-up-points-entry-design.md §4).
 */
export interface TopUpConfig {
	/** USD value of one point, decimal string, e.g. "0.10". */
	point_rate_usd: string
	/** The fewest points one top-up may credit. */
	min_points: number
	/** Active currencies that have a current rate; one missing here cannot be quoted. */
	currencies: TopUpCurrency[]
}
