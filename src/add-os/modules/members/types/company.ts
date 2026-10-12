import type { OfficeLease } from "./office-lease"

export type CompanyStatus = "active" | "inactive"

export interface Company {
	id: number
	private_office_request_id: number
	legal_name: string
	contract_ref: string
	branch_id: number
	status: CompanyStatus
	provider?: { id: number; name: string } | null
	office_leases?: OfficeLease[]
}

export interface CompanyPayload extends Record<string, unknown> {
	private_office_request_id: number | null
	legal_name: string
	contract_ref: string
	space_id?: number | null
	starts_on?: string
	duration_months?: number
	billing_cycle_months?: number
	monthly_amount?: string
	currency?: string
	billed_to?: "provider" | "company" | null
	auto_renew?: boolean
}

export interface CompanyStatusPayload extends Record<string, unknown> {
	status: CompanyStatus
}
