export type CompanyStatus = "active" | "inactive"

/**
 * Field names are literal from the Postman collection's Create Company body plus
 * Update Company Status's body — no example response exists for this resource
 * either (see private-office-request.ts's identical caveat).
 */
export interface Company {
	id: number
	private_office_request_id: number
	legal_name: string
	contract_ref: string
	branch_id: number
	status: CompanyStatus
}

/**
 * `private_office_request_id`/`branch_id`: `number | null`, not `number` — `null`
 * is the "nothing selected yet" sentinel for these two required selects.
 * async-validator's `isEmptyValue` treats `null` as empty unconditionally but
 * never treats a numeric `0` as empty, so `0` would silently pass a
 * `required: true` rule with nothing actually selected. By the time
 * ResourceFormDrawer's validation passes and onSubmit fires, both are
 * guaranteed real ids — the widening only affects transient form-editing state.
 * (Same precedent as `modules/spatial/types/zone.ts`'s `ZonePayload.floor_id` and
 * `modules/spatial/types/space.ts`'s `SpacePayload.building_id`.)
 */
export interface CompanyPayload extends Record<string, unknown> {
	private_office_request_id: number | null
	branch_id: number | null
	legal_name: string
	contract_ref: string
}

export interface CompanyStatusPayload extends Record<string, unknown> {
	status: CompanyStatus
}
