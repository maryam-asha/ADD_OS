import type { Coupon, CouponPayload } from "@/add-os/modules/pricing/types/coupon"

/**
 * A coupon as read from `GET admin/coupons/{id}`, turned into the full body
 * `PUT` requires — the server validates `code`, `discount_type` and
 * `discount_value` on every update, so nothing is ever sent partially.
 *
 * Throws without `user_ids`: only the detail endpoint carries them, and a
 * body built from a list row would send `[]` and silently lift the coupon's
 * member restriction. Times go back exactly as read — they end in `Z`, which
 * the server takes at its word. An offer goes back without a code: it has
 * none, and the server refuses one.
 */
export function couponToPayload(coupon: Coupon): CouponPayload {
	if (!Array.isArray(coupon.user_ids)) {
		throw new TypeError("couponToPayload needs the coupon detail: user_ids is missing")
	}
	return {
		...(coupon.is_automatic ? {} : { code: coupon.code ?? "" }),
		is_automatic: coupon.is_automatic,
		name: coupon.name,
		description: coupon.description,
		discount_type: coupon.discount_type,
		discount_value: coupon.discount_value,
		max_discount_points: coupon.max_discount_points,
		min_amount_points: coupon.min_amount_points,
		combinable_with_offers: coupon.combinable_with_offers,
		usage_limit: coupon.usage_limit,
		per_user_limit: coupon.per_user_limit,
		new_members_only: coupon.new_members_only,
		company_id: coupon.company_id,
		starts_at: coupon.starts_at,
		ends_at: coupon.ends_at,
		is_active: coupon.is_active,
		targets: (coupon.targets ?? []).map(({ purpose, plan_id, space_id, space_type, event_id }) => ({ purpose, plan_id, space_id, space_type, event_id })),
		user_ids: [...coupon.user_ids]
	}
}
