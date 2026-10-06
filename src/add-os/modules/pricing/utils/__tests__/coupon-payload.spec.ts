import type { Coupon } from "@/add-os/modules/pricing/types/coupon"
import { describe, expect, it } from "vitest"
import { couponToPayload } from "../coupon-payload"

const detail: Coupon = {
	id: 7,
	code: "WELCOME20",
	is_automatic: false,
	name: { ar: "عرض الترحيب", en: "Welcome offer" },
	description: null,
	source: "admin",
	discount_type: "percentage",
	discount_value: 20,
	max_discount_points: 200,
	min_amount_points: null,
	combinable_with_offers: true,
	usage_limit: 10,
	per_user_limit: 1,
	new_members_only: false,
	company_id: null,
	starts_at: "2026-10-05T06:00:00.000000Z",
	ends_at: null,
	is_active: true,
	used: 3,
	targets: [{ id: 91, purpose: "booking", plan_id: null, space_id: null, space_type: "room", event_id: null }],
	user_ids: [4, 9],
	created_by: 1,
	created_at: "2026-10-05T05:00:00.000000Z"
}

describe("couponToPayload", () => {
	it("keeps every writable field and drops the read-only ones", () => {
		const payload = couponToPayload(detail)
		expect(payload).toEqual({
			code: "WELCOME20",
			is_automatic: false,
			name: { ar: "عرض الترحيب", en: "Welcome offer" },
			description: null,
			discount_type: "percentage",
			discount_value: 20,
			max_discount_points: 200,
			min_amount_points: null,
			combinable_with_offers: true,
			usage_limit: 10,
			per_user_limit: 1,
			new_members_only: false,
			company_id: null,
			starts_at: "2026-10-05T06:00:00.000000Z",
			ends_at: null,
			is_active: true,
			targets: [{ purpose: "booking", plan_id: null, space_id: null, space_type: "room", event_id: null }],
			user_ids: [4, 9]
		})
	})

	it("passes times back unchanged, so they keep their Z", () => {
		expect(couponToPayload(detail).starts_at).toMatch(/Z$/)
	})

	it("refuses a list row, which carries no user_ids", () => {
		const { user_ids: _omit, ...row } = detail
		expect(() => couponToPayload(row)).toThrow(/user_ids/)
	})

	it("sends an offer back without a code, still automatic", () => {
		const payload = couponToPayload({ ...detail, code: null, is_automatic: true } as never)
		expect(payload).not.toHaveProperty("code")
		expect(payload.is_automatic).toBe(true)
	})
})
