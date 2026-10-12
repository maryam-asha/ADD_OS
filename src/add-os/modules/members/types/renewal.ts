export type RenewalType = "membership" | "lease"

export interface StoppedRenewalRow {
	type: RenewalType
	id: number
	company: { id: number; legal_name: string } | null
	provider: { id: number; name: string } | null
	reason: string
	reason_label: string
	ends_at: string
	has_ended: boolean
}

export interface StoppedRenewalsFilterQuery {
	type?: RenewalType | ""
	provider_id?: number
	reason?: string
	page?: number
	per_page?: number
}
