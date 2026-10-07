import type { CouponDiscountType } from "./coupon"
import type { DiscountKind } from "./discount-report"

/**
 * One thing taken off a booking, a payment, a co-working session or an event
 * registration — its `discounts`, pinned collection 2026-10-07. Copied from
 * the ledger when the price was locked: renaming or changing the offer later
 * does not rewrite it.
 *
 * `offer_id` names an offer, `coupon_id` a typed coupon (with its `code`),
 * `plan_discount_id` a plan discount. `duration_saving` is a package's saving,
 * which took nothing off the price; its `name` is what it was compared to.
 */
export interface AppliedDiscount {
	kind: DiscountKind
	offer_id: number | null
	coupon_id: number | null
	plan_discount_id: number | null
	/** In the request's language, as it was when the price was locked. */
	name: string | null
	code: string | null
	discount_type: CouponDiscountType | null
	discount_value: number | null
	max_discount_points: number | null
	base_points: number
	points: number
	/** Of `base_points`, rounded down by the server. */
	percent: number
}
