export type ProviderStatus = "active" | "inactive"

export interface Provider {
	id: number
	name: string
	contract_ref?: string
	status: ProviderStatus
	payment_terms_days: number
	created_at: string
	users_count?: number
	companies_count?: number
}

export interface ProviderRequest {
	id: number
	provider_id: number
	company_id?: number
	type: "plan_assignment" | "plan_design" | "wallet_top_up" | "company_member" | "company_admin"
	status: "pending" | "approved" | "rejected" | "cancelled"
	rejection_reason?: string
	payload: any
	created_at: string
	invoice_preview?: any
	invoice?: any
}

export interface Invoice {
	id: number
	provider_id?: number
	company_id?: number
	payer: "provider" | "company"
	amount: number
	currency: string
	status: "unpaid" | "partial" | "paid" | "cancelled"
	overdue: boolean
	due_date: string
	created_at: string
	payments?: InvoicePayment[]
}

export interface InvoicePayment {
	id: number
	amount: number
	currency: string
	method: string
	receipt_number?: string
	payment_date: string
	is_void: boolean
	void_reason?: string
}
