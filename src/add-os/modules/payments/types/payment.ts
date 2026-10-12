import type { AppliedDiscount } from "@/add-os/modules/pricing/types/applied-discount"

/**
 * Payments as the dashboard sees them (`GET /api/v1/admin/payments…` and
 * `GET /api/v1/admin/payment-methods`). One ledger for every method — wallet
 * points, cash at the desk, a card gateway — and every purpose.
 */

export type PaymentStatus = "pending" | "accepted" | "failed" | "canceled" | "reversed" | "expired" | "needs_review"

export type PaymentPurpose = "wallet_top_up" | "plan_purchase" | "booking" | "event_registration" | "coworking_session" | "booking_extension"

export const PAYMENT_STATUSES: PaymentStatus[] = ["pending", "accepted", "needs_review", "failed", "canceled", "reversed", "expired"]

export const PAYMENT_PURPOSES: PaymentPurpose[] = ["booking", "booking_extension", "coworking_session", "wallet_top_up", "plan_purchase", "event_registration"]

/** One row of `GET /api/v1/admin/payments` (PaymentResource, admin view). */
export interface AdminPayment {
	id: number
	status: PaymentStatus
	purpose: PaymentPurpose
	method: string
	method_label: string
	user: { id: number, name: string, phone: string } | null
	/** What a card was charged: a whole amount of `currency`, as sent to the gateway. */
	charged_amount: number | null
	currency: string | null
	points_to_credit: number | null
	/** What the payment is worth in points, whatever the method. */
	amount_points: number | null
	transaction_id: number | null
	payable: { type: string, id: number } | null
	expires_at: string | null
	plan_id: number | null
	membership_id: number | null
	/** The bank's reference. */
	rrn: string | null
	created_at: string | null
	gateway_payment_id: string | null
	review_reason: string | null
	reversed_at: string | null
	refunded_at: string | null
	/** Cash taken at the desk. */
	collected_via: string | null
	received_amount: string | null
	received_currency: string | null
	received_by: number | null
	received_by_name?: string | null
	received_at: string | null
	/**
	 * What was taken off it, as locked when it was priced (pinned collection
	 * 2026-10-07). Absent only from data cached before it existed.
	 */
	discounts?: AppliedDiscount[]
}

/** `GET /api/v1/admin/payments/summary` — totals over the list's filters. */
export interface PaymentsSummary {
	total: number
	by_status: Partial<Record<PaymentStatus, number>>
	accepted: { count: number, points: number }
	by_method: { method: string, label: string, count: number, accepted_count: number, accepted_points: number }[]
	/** Cash handed over at the desk, per currency. */
	cash: { currency: string | null, amount: string }[]
	/** What cards were charged, per currency. */
	card: { currency: string | null, amount: string }[]
}

/** `GET /api/v1/admin/payment-methods` — one configured method. */
export interface PaymentMethodInfo {
	key: string
	label: string
	enabled: boolean
	/** A card gateway: has an outcome to ask for, and can be reversed. */
	gateway: boolean
	purposes: { purpose: PaymentPurpose, supported: boolean }[]
	usage: {
		count: number
		accepted_count: number
		accepted_points: number
		/** Pending or awaiting review. */
		open_count: number
		last_used_at: string | null
	}
}
