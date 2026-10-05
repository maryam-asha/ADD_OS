import type { PlanModule } from "./plan-module"
import type { SpaceType } from "@/add-os/modules/spatial/types/space"

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

/**
 * A structured, computed discount — the sibling of PlanFeature's plain-text
 * discount sentences. `space_id` and `space_type` are mutually exclusive
 * (enforced server-side by PlanDiscount::booted(), and client-side by the
 * form's target-mode picker never setting both at once); `null`/`null` means
 * a plan-wide discount. `usage_limit` is a redemption counter, not a points
 * budget — `null` means unlimited.
 */
export interface PlanDiscountItem {
	id?: number
	percentage: number
	space_id?: number | null
	space_type?: SpaceType | null
	usage_limit?: number | null
	description?: { ar: string; en: string } | null
	is_active: boolean
	order?: number
	/**
	 * Form-only UI state, never sent to the API (handleSubmit's payload
	 * mapping lists fields explicitly, so this is dropped automatically).
	 * `space_id`/`space_type` alone can't distinguish "targeting a specific
	 * space, none picked yet" from "plan-wide" — both read as null — so the
	 * picker needs its own field to stay on "space" while empty.
	 */
	targetMode?: "all" | "space" | "space_type"
}

/**
 * A structured, natural-unit quota grant — the sibling of PlanBalance's
 * point-denominated grants and PlanDiscount's percentage grants. `quantity`
 * is a decimal (backend validates `numeric`, not `integer` — e.g. 5.5 hours
 * of internet), denominated in whatever `resource_type.unit_label` says, not
 * points.
 */
export interface PlanResourceGrantItem {
	id?: number
	resource_type_id: number
	resource_type?: {
		id: number
		slug: string
		name: { ar: string; en: string }
		unit_label: { ar: string; en: string }
		icon?: string | null
	} | null
	quantity: number
	description?: { ar: string; en: string } | null
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
	 * A sale on the price — all three set, or all three `null`. Sent and
	 * returned only on `admin/*` (collection pinned 2026-10-05, Create/Update
	 * Plan); read as ISO UTC, sent with an explicit offset.
	 */
	sale_price_points: number | null
	sale_starts_at: string | null
	sale_ends_at: string | null
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
	duration_days: number
	/**
	 * Daily access window as `H:i` wall-clock strings, e.g. `"20:00"` /
	 * `"00:00"` for an evening package. Both `null` means the plan applies at
	 * any hour, which is every plan created before this field existed.
	 *
	 * An end at or before the start is legal, not a mistake: the window wraps
	 * past midnight. `"00:00"` as an end means midnight-as-end-of-day, never a
	 * zero-length window. The backend splits a session's bill at these
	 * boundaries — hours inside the window draw on the plan's granted hours,
	 * hours outside are charged normally.
	 */
	access_window_start: string | null
	access_window_end: string | null
	is_active: boolean
	/**
	 * `false` hides the plan from every catalogue — the member app, the public
	 * site and the kiosk — leaving it assignable only from this dashboard.
	 * That is how a package negotiated for one company's staff reaches them:
	 * operations activates it for named members; nobody can browse or buy it.
	 *
	 * Admin listings are deliberately unaffected, or operations could not see
	 * a private plan in order to assign it.
	 */
	is_public: boolean
	order: number
	balances?: PlanBalanceItem[]
	features?: PlanFeatureItem[]
	discounts?: PlanDiscountItem[]
	resource_grants?: PlanResourceGrantItem[]
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
	/**
	 * A sale on the price — all three set, or all three `null`. Sent and
	 * returned only on `admin/*` (collection pinned 2026-10-05, Create/Update
	 * Plan); sent with an explicit offset. Left out, the server keeps the sale.
	 */
	sale_price_points?: number | null
	sale_starts_at?: string | null
	sale_ends_at?: string | null
	duration_days: number
	/**
	 * `H:i` strings, or both `null` for a plan with no window. The backend
	 * validates them as a pair (`required_with` each way), so sending one
	 * alone is a 422 by design.
	 */
	access_window_start: string | null
	access_window_end: string | null
	is_active: boolean
	is_public: boolean
	order: number
	balances?: PlanBalanceItem[]
	features?: PlanFeatureItem[]
	discounts?: PlanDiscountItem[]
	resource_grants?: PlanResourceGrantItem[]
}
