import type { PlanModule } from "./plan-module"

export type WalletBalanceCategoryType = "general" | "cafe" | "printing_internet" | "space_specific"

export interface PlanBalanceItem {
	id?: number
	category: WalletBalanceCategoryType
	/**
	 * Included balance in whole points. Points are the unit of account, so a
	 * plan's bundled credit is counted in the same integers everything else is
	 * priced in — the backend validates `integer` and rejects a fraction.
	 */
	amount_points: number
	restricted_space_id?: number | null
	description?: { ar: string; en: string } | null
	order?: number
}

export interface PlanFeatureItem {
	id?: number
	name: { ar: string; en: string }
	value?: { ar: string; en: string } | null
	icon?: string | null
	is_included: boolean
	order?: number
}

export interface Plan {
	id: number
	plan_module_id?: number | null
	plan_module?: PlanModule | null
	name: { ar: string; en: string }
	subtitle?: { ar: string; en: string } | null
	is_subscription: boolean
	/**
	 * Authoritative price, a whole integer of points. Points are the unit of
	 * account: this is the value the backend stores and charges against, and
	 * the only one that is exact. Everything below is derived for display.
	 */
	price_points: number
	/**
	 * `price_points` rendered in the base currency (USD) by the server, as a
	 * decimal string, e.g. "50.00". Display only — never parse it back into a
	 * point count, and never divide by the rate client-side.
	 */
	price_usd: string
	/**
	 * `price_points` rendered in the request's display currency by the server,
	 * as a decimal string, e.g. "735000.12". Pairs with `currency`.
	 */
	price_display: string
	/** ISO code `price_display` is denominated in, e.g. "SYP". */
	currency: string
	/** Per-hour overage charge in whole points; `null` when the plan has none. */
	overage_rate_points: number | null
	duration_days: number
	/** Decimal string, e.g. "20.00". */
	included_hours: string
	is_active: boolean
	order: number
	balances?: PlanBalanceItem[]
	features?: PlanFeatureItem[]
	created_at: string
}

export interface PlanPayload extends Record<string, unknown> {
	plan_module_id?: number | null
	name: { ar: string; en: string }
	subtitle?: { ar: string; en: string } | null
	is_subscription: boolean
	/**
	 * Whole points — the only price the backend accepts. It validates
	 * `integer`, so a fractional value comes back a 422 by design rather than
	 * a rounding question this client gets to answer.
	 *
	 * There is deliberately no companion currency key: a price in points does
	 * not carry one. `price_usd`/`price_display` on `Plan` are server-derived
	 * views of this number and are never sent back.
	 */
	price_points: number
	duration_days: number
	included_hours: number
	/** Per-hour overage in whole points; `0` when the plan has none. */
	overage_rate_points: number
	is_active: boolean
	order: number
	balances?: PlanBalanceItem[]
	features?: PlanFeatureItem[]
}
