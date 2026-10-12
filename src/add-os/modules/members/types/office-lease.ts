export type OfficeLeaseStatus = "active" | "ended" | "terminated"
export type LeasePeriodStatus = "upcoming" | "invoiced" | "cancelled"
export type LeasePayer = "provider" | "company"

export interface LeaseInvoice {
	id: number
	reference: string
	status: string
	is_overdue: boolean
	amount: string
	paid_amount: string
	remaining: string
	due_at: string | null
}

export interface LeasePeriod {
	sequence: number
	starts_on: string
	ends_on: string
	amount: string
	status: LeasePeriodStatus
	invoice: LeaseInvoice | null
}

export interface LeaseAccess {
	status: "active" | "none"
	expires_at: string | null
	warning: "no_lock" | null
}

export interface OfficeLease {
	id: number
	reference: string
	status: OfficeLeaseStatus
	company?: { id: number; legal_name: string }
	space?: { id: number; name: string; branch_id: number | null }
	provider?: { id: number; name: string } | null
	billed_to: LeasePayer
	currency: string
	monthly_amount: string
	starts_on: string
	ends_on: string
	access_ends_on: string
	duration_months: number
	billing_cycle_months: number
	terminated_on?: string | null
	auto_renew: boolean
	renewal_stop_reason?: string | null
	renewal_stop_reason_label?: string | null
	renewals_count: number
	periods?: LeasePeriod[]
	created_at: string
	// Staff only fields:
	private_office_request_id?: number | null
	termination_reason?: string | null
	access?: LeaseAccess | null
}

export interface TerminateLeasePayload {
	terminated_on: string
	reason: string
}

export interface CreateLeaseFromRequestPayload {
	contract_ref: string
	space_id: number
	starts_on: string
	duration_months: number
	billing_cycle_months: number
	monthly_amount: string | number
	currency: string
	billed_to?: LeasePayer | null
	auto_renew?: boolean
}

export interface OfficeLeaseFilterQuery {
	company_id?: number
	provider_id?: number
	space_id?: number
	branch_id?: number
	status?: OfficeLeaseStatus | ""
	ending_within_days?: number
	per_page?: number
	page?: number
}
