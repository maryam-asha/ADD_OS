import type { Bilingual } from "@/add-os/components/resource/field-types"
import type { SpaceType } from "@/add-os/modules/spatial/types/space"

/**
 * A discount code as the dashboard reads and writes it — ADDCore
 * `CouponResource` / `StoreCouponRequest`, collection pinned 2026-10-05
 * (`Admin (Dashboard) / Coupons`).
 */
export type CouponDiscountType = "percentage" | "amount_off"
export const PRICING_PURPOSES = ["booking", "coworking_session", "plan_purchase", "event_registration"] as const
export type PricingPurpose = (typeof PRICING_PURPOSES)[number]
export const COUPON_STATES = ["running", "scheduled", "ended"] as const
export type CouponState = (typeof COUPON_STATES)[number]

export type TargetItemKey = "plan_id" | "space_id" | "space_type" | "event_id"

/**
 * Which item a target may name for its purpose — mirrors the backend's
 * `CouponTarget::itemsFor`. Used only to narrow what the form offers; the
 * server's 422 on `targets.N` stays the judge.
 */
export const ITEM_KEYS_BY_PURPOSE: Record<PricingPurpose, TargetItemKey[]> = {
	plan_purchase: ["plan_id"],
	booking: ["space_id", "space_type"],
	coworking_session: ["space_id", "space_type"],
	event_registration: ["event_id"]
}

export interface CouponTargetPayload {
	purpose: PricingPurpose
	plan_id: number | null
	space_id: number | null
	space_type: SpaceType | null
	event_id: number | null
}

export interface CouponTarget extends CouponTargetPayload {
	id: number
}

export interface Coupon {
	id: number
	code: string
	name: Bilingual | null
	description: Bilingual | null
	source: string | null
	discount_type: CouponDiscountType
	discount_value: number
	max_discount_points: number | null
	min_amount_points: number | null
	combinable_with_offers: boolean
	usage_limit: number | null
	per_user_limit: number | null
	new_members_only: boolean
	company_id: number | null
	/** ISO-8601 UTC (`…Z`); display with `formatDateTime`. */
	starts_at: string | null
	ends_at: string | null
	is_active: boolean
	/** Uses that still count against the limits. List and detail. */
	used?: number
	/** List, detail and create response. */
	targets?: CouponTarget[]
	/** Detail and create response ONLY — never on a list row. */
	user_ids?: number[]
	created_by: number | null
	created_at: string
}

export interface CouponPayload {
	code: string
	name: Bilingual | null
	description: Bilingual | null
	discount_type: CouponDiscountType
	discount_value: number
	max_discount_points: number | null
	min_amount_points: number | null
	combinable_with_offers: boolean
	usage_limit: number | null
	per_user_limit: number | null
	new_members_only: boolean
	company_id: number | null
	starts_at: string | null
	ends_at: string | null
	is_active: boolean
	targets: CouponTargetPayload[]
	user_ids: number[]
}

export interface CouponRedemption {
	id: number
	user: { id: number, name: string, phone: string } | null
	purpose: PricingPurpose
	booking_id: number | null
	walkin_session_id: number | null
	event_attendee_id: number | null
	payment_id: number | null
	discount_type: CouponDiscountType
	discount_value: number
	max_discount_points: number | null
	base_points: number
	points_discounted: number
	/** `false`: the record was cancelled, rejected or failed — the use was given back. */
	counts: boolean
	created_at: string
}
