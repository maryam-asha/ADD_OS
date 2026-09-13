export type CashRegisterSessionStatus = "open" | "closed"

export interface CashRegisterSession {
	id: number
	user_id: number
	operator_name?: string
	branch_id: number
	branch_name?: string | { ar: string; en: string }
	status: CashRegisterSessionStatus
	opened_at: string
	closed_at: string | null
	opening_balance: string
	closing_balance: string | null
	expected_balance: string | null
	difference: string | null
	notes: string | null
	created_at: string
}

export interface OpenSessionPayload {
	branch_id?: number
	opening_balance?: string
	notes?: string
}

export interface CloseSessionPayload {
	closing_balance: string
	notes?: string
}
