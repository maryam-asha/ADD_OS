import type { CouponDiscountType, CouponTarget } from "./coupon"

/**
 * Which offers ran in a period — ADDCore `GET admin/reports/offers`, pinned
 * collection 2026-10-07 (`Admin (Dashboard) / Reports / Offer Report`). Built
 * from every version an admin saved, so an offer changed or deleted since
 * still shows where it ran.
 */
export const OFFER_REPORT_TYPES = ["offer", "coupon"] as const
export type OfferReportType = (typeof OFFER_REPORT_TYPES)[number]

export interface OfferReportQuery {
	/** Local dates, `Y-m-d`, both inclusive. */
	from: string
	to: string
	type: OfferReportType
}

/** One stretch it was switched on and inside its own dates, clipped to the period, on the terms it had then. */
export interface OfferReportPeriod {
	/** ISO UTC. */
	from: string
	to: string
	discount_type: CouponDiscountType
	discount_value: number
	max_discount_points: number | null
	min_amount_points: number | null
	targets: Omit<CouponTarget, "id">[]
}

export interface OfferReportRow {
	id: number
	/** Its latest name, in the request's language. */
	name: string | null
	code: string | null
	deleted: boolean
	periods: OfferReportPeriod[]
	/** Uses that still count, in the period. */
	operations: number
	points: number
}
