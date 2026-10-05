import type { Coupon } from "@/add-os/modules/pricing/types/coupon"
import { describe, expect, it } from "vitest"
import { couponToForm, emptyCouponForm, formToPayload, groupErrors } from "../coupon-form"

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
