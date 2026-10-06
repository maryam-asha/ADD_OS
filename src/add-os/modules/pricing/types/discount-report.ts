import type { PricingPurpose } from "./coupon"

/**
 * The discount report — ADDCore `GET admin/reports/discounts`, pinned
 * collection 2026-10-06 (`Admin (Dashboard) / Reports`). One row per
 * operation that carried a discount or a saving; `counted` is false for a
 * cancelled, rejected, failed or reversed one, which the totals leave out.
 */
export const DISCOUNT_KINDS = ["offer", "plan_discount", "coupon", "duration_saving"] as const
export type DiscountKind = (typeof DISCOUNT_KINDS)[number]
export type ReductionKind = Exclude<DiscountKind, "duration_saving">
export const REPORT_STATUSES = ["counted", "void"] as const
export type ReportStatus = (typeof REPORT_STATUSES)[number]

export interface DiscountReportFilters {
	/** Local dates, `Y-m-d`, inclusive. */
	from: string | null
	to: string | null
	kind: DiscountKind | null
	purpose: PricingPurpose | null
	status: ReportStatus | null
}

export interface DiscountReportQuery extends DiscountReportFilters {
	page: number
	per_page: number
}

export interface ReportDiscount {
	kind: ReductionKind
	/** An offer's name, in the request's language. */
	name: string | null
	/** A coupon's code. */
	code: string | null
	points: number
	/** Rounded down by the server. */
	percent: number
}

export interface DiscountReportRow {
	record: { type: "booking" | "walkin_session" | "event_attendee" | "payment", id: number, reference: string | null }
	member: { id: number, name: string, phone: string } | null
	purpose: PricingPurpose
	/** When the price was locked, ISO UTC. */
	at: string
	/** The record's own status; a walk-in's payment state. */
	status: string | null
	counted: boolean
	list_points: number | null
	final_points: number | null
	discounts: ReportDiscount[]
	saving: { points: number, percent: number, reference_name: string | null, units: number | null } | null
}

/** Over counted operations only; savings totalled apart, never taken off the list. */
export interface DiscountReportTotals {
	operations: number
	list_points: number
	final_points: number
	points_by_kind: Record<ReductionKind, number>
	saving_points: number
	effective_percent: number
}

export interface DiscountReport {
	data: DiscountReportRow[]
	total: number
	totals: DiscountReportTotals
}
