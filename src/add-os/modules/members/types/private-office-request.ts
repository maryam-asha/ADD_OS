/**
 * Field names are literal from the Postman collection's Create/Mark-as-Quoted
 * request bodies. The collection ships zero example responses for any endpoint
 * (verified: 0 occurrences of a "response" key across the whole file), so this
 * entity shape is an aggregation of every field named across those bodies, not
 * a real response read off the wire. If the live API returns more fields, this
 * type is the first place to update once a real response is seen.
 */
export type PrivateOfficeRequestStatus = "requested" | "quoted" | "contracted"

export interface PrivateOfficeRequest {
	id: number
	prospect_name: string
	contact: string
	status: PrivateOfficeRequestStatus
	quote_ref: string | null
}

export interface PrivateOfficeRequestPayload extends Record<string, unknown> {
	prospect_name: string
	contact: string
}

/**
 * The collection's PUT accepts `status: "requested" | "quoted"` generically, but
 * "requested" is never a useful transition from this UI (nothing reverts a quote)
 * and "contracted" always 422s here — only reachable via Companies/createCompany.
 * This payload only carries what the UI's one real action needs; the service
 * function (Task 4) supplies the fixed `status: "quoted"` itself.
 */
export interface MarkAsQuotedPayload extends Record<string, unknown> {
	quote_ref: string
}
