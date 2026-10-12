export type ProviderStatus = "active" | "inactive"

export interface Provider {
	id: number
	name: string
	contract_ref: string
	status: ProviderStatus
	payment_terms_days: number | null
	created_at: string
	users_count?: number
	companies_count?: number
	/** Loaded on show only. */
	users?: { id: number; name: string; email: string | null }[]
}

export type ProviderRequestType = "plan_assignment" | "plan_design" | "wallet_top_up" | "company_member" | "company_admin"
export type ProviderRequestStatus = "pending" | "approved" | "rejected" | "cancelled"

/** What issuing the request's invoice would store — pending requests only. */
export interface InvoicePreview {
	points: number | null
	currency: string
	computed_amount: string
	amount: string
	issued_at: string
	due_at: string
}

export interface ProviderRequest {
	id: number
	type: ProviderRequestType
	status: ProviderRequestStatus
	provider?: { id: number; name: string }
	company: { id: number; legal_name: string | null } | null
	/** The submitted fields, flat, as the type defines them (plan_id, seats, payer, points, name, phone, user_id …). */
	payload: Record<string, unknown>
	submitted_by: { id: number; name: string } | null
	reviewed_at: string | null
	rejection_reason: string | null
	result_id: number | null
	invoice_preview?: InvoicePreview | null
	invoice?: { id: number; reference: string; status: string; amount: string; currency: string } | null
	created_at: string
}

export interface ApproveProviderRequestPayload {
	override_capacity?: boolean
	invoice_currency?: string
	invoice_amount?: string
	invoice_due_at?: string
}

export type InvoiceStatus = "unpaid" | "partially_paid" | "paid" | "cancelled"
export type InvoicePayer = "provider" | "company"
export type InvoicePaymentMethod = "bank_transfer" | "cash" | "cheque" | "other"

/** InvoiceResource — amounts are strings without trailing zeros ("300", "150.5"). */
export interface Invoice {
	id: number
	reference: string
	status: InvoiceStatus
	is_overdue: boolean
	billed_to: InvoicePayer
	provider?: { id: number; name: string } | null
	company?: { id: number; legal_name: string }
	provider_request_id: number | null
	office_lease_period_id: number | null
	description: string | null
	points: number | null
	currency: string
	amount: string
	paid_amount: string
	remaining: string
	issued_at: string | null
	due_at: string | null
	cancelled_at: string | null
	payments?: InvoicePayment[]
}

export interface InvoicePayment {
	id: number
	amount: string
	received_amount: string
	received_currency: string
	method: InvoicePaymentMethod
	receipt_number: string | null
	paid_at: string | null
	voided: boolean
	voided_at: string | null
}

export interface RecordInvoicePaymentPayload {
	amount: string
	currency: string
	method: InvoicePaymentMethod
	receipt_number?: string | null
	paid_at: string
}
