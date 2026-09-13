import type { PlanModule } from "./plan-module"

export type WalletBalanceCategoryType = "general" | "cafe" | "printing_internet" | "space_specific"

export interface PlanBalanceItem {
	id?: number
	category: WalletBalanceCategoryType
	amount: number
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
	balances?: PlanBalanceItem[]
	features?: PlanFeatureItem[]
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

export interface PlanPayload extends Record<string, unknown> {
	plan_module_id?: number | null
	name: { ar: string; en: string }
	subtitle?: { ar: string; en: string } | null
	is_subscription: boolean
	price: number
	pricing_currency: "USD" | "SYP"
	duration_days: number
	included_hours: number
	overage_rate: number
	is_active: boolean
	order: number
	balances?: PlanBalanceItem[]
	features?: PlanFeatureItem[]
}
