import type { Coupon } from "@/add-os/modules/pricing/types/coupon"
import { describe, expect, it } from "vitest"
import { couponToForm, discountLabel, emptyCouponForm, formToPayload, groupErrors, hasLimits, missingLimits } from "../coupon-form"

describe("coupon form mapping", () => {
	it("starts per_user_limit at 1 and usage_limit unlimited", () => {
		const payload = formToPayload({ ...emptyCouponForm(), code: "a-1", discount_value: 10 })
		expect(payload.per_user_limit).toBe(1)
		expect(payload.usage_limit).toBeNull()
		expect(payload.code).toBe("A-1")
	})

	it("sends null, not a missing key, for an unlimited per-member allowance", () => {
		const payload = formToPayload({ ...emptyCouponForm(), code: "X", discount_value: 10, per_user_unlimited: true, per_user_limit: 3 })
		expect(payload).toHaveProperty("per_user_limit", null)
	})

	it("drops the cap for points-off discounts", () => {
		const payload = formToPayload({ ...emptyCouponForm(), code: "X", discount_type: "amount_off", discount_value: 50, max_discount_points: 99 })
		expect(payload.max_discount_points).toBeNull()
	})

	it("always sends targets and user_ids, and maps a target row to one item column", () => {
		const form = {
			...emptyCouponForm(),
			code: "X",
			discount_value: 10,
			targets: [
				{ purpose: "booking" as const, itemKey: "space_type" as const, itemValue: "room" },
				{ purpose: "plan_purchase" as const, itemKey: null, itemValue: null }
			]
		}
		const payload = formToPayload(form)
		expect(payload.user_ids).toEqual([])
		expect(payload.targets).toEqual([
			{ purpose: "booking", plan_id: null, space_id: null, space_type: "room", event_id: null },
			{ purpose: "plan_purchase", plan_id: null, space_id: null, space_type: null, event_id: null }
		])
	})

	it("sends empty bilingual text and empty times as null", () => {
		const payload = formToPayload({ ...emptyCouponForm(), code: "X", discount_value: 10, starts_at: "" as never })
		expect(payload.name).toBeNull()
		expect(payload.starts_at).toBeNull()
	})

	it("round-trips a detail through the form", () => {
		const coupon = {
			id: 1,
			code: "VIP",
			name: { ar: "كبار", en: "VIP" },
			description: null,
			source: null,
			discount_type: "percentage",
			discount_value: 15,
			max_discount_points: 40,
			min_amount_points: 100,
			combinable_with_offers: false,
			usage_limit: null,
			per_user_limit: null,
			new_members_only: true,
			company_id: 2,
			starts_at: "2026-10-05T06:00:00.000000Z",
			ends_at: null,
			is_active: true,
			targets: [{ id: 5, purpose: "event_registration", plan_id: null, space_id: null, space_type: null, event_id: 8 }],
			user_ids: [3],
			created_by: 1,
			created_at: "x"
		} as Coupon
		const form = couponToForm(coupon)
		expect(form.per_user_unlimited).toBe(true)
		expect(form.usage_unlimited).toBe(true)
		expect(form.targets[0]).toEqual({ purpose: "event_registration", itemKey: "event_id", itemValue: 8 })
		const { id: _i, source: _s, created_by: _c, created_at: _a, ...rest } = coupon
		expect(formToPayload(form)).toEqual({ ...rest, targets: [{ purpose: "event_registration", plan_id: null, space_id: null, space_type: null, event_id: 8 }] })
	})
})

describe("groupErrors", () => {
	it("routes targets.N and targets.N.* to row N, user_ids.N to user_ids, and keeps unknown keys", () => {
		const grouped = groupErrors({
			"code": ["taken"],
			"targets.1": ["bad target"],
			"targets.1.plan_id": ["no plan"],
			"user_ids.0": ["no user"],
			"name.ar": ["required"],
			"mystery": ["?"]
		}, ["code", "name.ar", "user_ids"])
		expect(grouped.fields).toEqual({ "code": ["taken"], "name.ar": ["required"], "user_ids": ["no user"] })
		expect(grouped.targets).toEqual({ 1: ["bad target", "no plan"] })
		expect(grouped.other).toEqual(["?"])
	})
})

describe("emptyCouponForm", () => {
	it("does not combine with offers unless the admin turns it on — the server's default too", () => {
		expect(emptyCouponForm().combinable_with_offers).toBe(false)
		expect(formToPayload({ ...emptyCouponForm(), code: "X" }).combinable_with_offers).toBe(false)
	})
})

describe("missingLimits", () => {
	it("flags an emptied limit box that is not marked unlimited — empty must never read as unlimited", () => {
		expect(missingLimits({ ...emptyCouponForm(), per_user_limit: null })).toEqual(["per_user_limit"])
		expect(missingLimits({ ...emptyCouponForm(), usage_unlimited: false, usage_limit: null })).toEqual(["usage_limit"])
	})

	it("accepts a number, or an explicit unlimited", () => {
		expect(missingLimits(emptyCouponForm())).toEqual([])
		expect(missingLimits({ ...emptyCouponForm(), per_user_unlimited: true, per_user_limit: null })).toEqual([])
	})
})

// Offers: coupons with is_automatic, no code (ADDCore pinned collection 2026-10-06, Create Offer).
describe("offers", () => {
	it("starts an offer with no code and no per-member limit", () => {
		const form = emptyCouponForm(true)
		expect(form.is_automatic).toBe(true)
		expect(form.per_user_unlimited).toBe(true)
		const payload = formToPayload({ ...form, code: "IGNORED", discount_value: 20 })
		expect(payload).not.toHaveProperty("code")
		expect(payload.is_automatic).toBe(true)
		expect(payload.per_user_limit).toBeNull()
	})

	it("sends a typed coupon as not automatic, with its code", () => {
		const payload = formToPayload({ ...emptyCouponForm(), code: "x1", discount_value: 10 })
		expect(payload.is_automatic).toBe(false)
		expect(payload.code).toBe("X1")
	})

	it("sends no cap with points off — a cap only bounds a percentage", () => {
		const payload = formToPayload({ ...emptyCouponForm(true), discount_type: "amount_off", discount_value: 20, max_discount_points: 30 })
		expect(payload.discount_type).toBe("amount_off")
		expect(payload.discount_value).toBe(20)
		expect(payload.max_discount_points).toBeNull()
	})

	it("labels points off as an amount off", () => {
		const t = (key: string, params?: Record<string, unknown>) => `${key}:${params?.value ?? ""}`
		expect(discountLabel(t as never, { discount_type: "amount_off", discount_value: 20 })).toBe("coupons.detail.discountPoints:20")
	})

	it("says whether a limit is set: total or per member", () => {
		expect(hasLimits(emptyCouponForm(true))).toBe(false)
		expect(hasLimits({ ...emptyCouponForm(true), usage_unlimited: false, usage_limit: 50 })).toBe(true)
		expect(hasLimits({ ...emptyCouponForm(true), per_user_unlimited: false, per_user_limit: 1 })).toBe(true)
	})
})
