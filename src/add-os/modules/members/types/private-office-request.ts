export type PrivateOfficeRequestStatus = "requested" | "quoted" | "contracted"
export type PrivateOfficeRequestPayer = "provider" | "company"

export interface PrivateOfficeRequest {
	id: number
	prospect_name: string
	contact: string
	status: PrivateOfficeRequestStatus
	quote_ref: string | null
	provider_id?: number | null
	provider?: { id: number; name: string } | null
	company_id?: number | null
	company?: { id: number; legal_name: string } | null
	payer?: PrivateOfficeRequestPayer | null
	contract_ref?: string | null
	converted_company_id?: number | null
}

export interface PrivateOfficeRequestPayload extends Record<string, unknown> {
	prospect_name: string
	contact: string
	company_id?: number | null
	payer?: PrivateOfficeRequestPayer | null
}

export interface MarkAsQuotedPayload extends Record<string, unknown> {
	quote_ref: string
}
