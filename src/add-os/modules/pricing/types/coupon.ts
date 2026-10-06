import type { Bilingual } from "@/add-os/components/resource/field-types"
import type { SpaceType } from "@/add-os/modules/spatial/types/space"

/**
 * A discount code as the dashboard reads and writes it — ADDCore
 * `CouponResource` / `StoreCouponRequest`, collection pinned 2026-10-05
 * (`Admin (Dashboard) / Coupons`) — or, `is_automatic`, an offer: no code,
 * it applies itself (collection pinned 2026-10-06, `Offers (automatic)`).
 *
 * `fixed_price` is for offers only: `discount_value` is then the price —
 * points per hour for time in a space, points for a plan or an event.
 */
export type CouponDiscountType = "percentage" | "amount_off" | "fixed_price"
export const PRICING_PURPOSES = ["booking", "coworking_session", "plan_purchase", "event_registration"] as const
export type PricingPurpose = (typeof PRICING_PURPOSES)[number]
export const COUPON_STATES = ["running", "scheduled", "ended"] as const
export type CouponState = (typeof COUPON_STATES)[number]

export type TargetItemKey = "plan_id" | "space_id" | "space_type" | "event_id"

/**
 * The purposes a fixed price means the same thing across — the server's
 * `offer_fixed_price_family` rule: a fixed-price offer's targets all come
 * from one of these.
 */
export const FIXED_PRICE_FAMILIES: PricingPurpose[][] = [
	["booking", "coworking_session"],
	["plan_purchase"],
	["event_registration"]
]

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
	/** `null` for an offer. */
	code: string | null
	is_automatic: boolean
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
	/** Left out for an offer — the server refuses a code on one. */
	code?: string
	/** Read on create only; an update never turns a coupon into an offer or back. */
	is_automatic: boolean
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
	/** `offer` or `coupon` — the two kinds of row a coupon's limits count. */
	kind: "offer" | "coupon"
	discount_type: CouponDiscountType
	discount_value: number
	max_discount_points: number | null
	base_points: number
	/** What it took off. */
	points: number
	/** `points` of `base_points`, rounded down. */
	percent: number
	/** `false`: the record was cancelled, rejected or failed — the use was given back. */
	counts: boolean
	created_at: string
}
