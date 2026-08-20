export interface Plan {
	id: number
	name: { ar: string; en: string }
	is_subscription: boolean
	/** Decimal string as returned by the API, e.g. "150.00". */
	price: string
	pricing_currency: "USD" | "SYP"
	duration_days: number
	/** Decimal string, e.g. "20.00". */
	included_hours: string
	/** Decimal string, e.g. "5.00". */
	overage_rate: string
	is_active: boolean
	order: number
	created_at: string
	/**
	 * Present ONLY when the request's `currency` header differs from
	 * `pricing_currency` — confirmed live (verification report §"Currency header
	 * effect on Plans pricing"). `price`/`pricing_currency` never change; this is
	 * an additive server-side conversion using the latest applicable exchange
	 * rate as of now.
	 */
	converted_amount?: string
	converted_currency?: "USD" | "SYP"
}

/**
 * Extends `Record<string, unknown>` so this is structurally assignable to
 * `ResourceFormDrawer`'s `TModel extends Record<string, unknown>` generic (see
 * `BranchPayload`'s identical doc comment for why a plain interface needs this).
 *
 * `price`/`included_hours`/`overage_rate` are `number` here, not `string` like
 * `Plan` — the API accepts numeric JSON for all three (confirmed live) and this
 * is what `n-input-number` binds to.
 */
export interface PlanPayload extends Record<string, unknown> {
	name: { ar: string; en: string }
	is_subscription: boolean
	price: number
	pricing_currency: "USD" | "SYP"
	duration_days: number
	included_hours: number
	overage_rate: number
	is_active: boolean
	order: number
}
