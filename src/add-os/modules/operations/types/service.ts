import type { FieldValidation } from "@/add-os/components/resource/form-fields"

export type RequestMethod =
	| "form"
	| "external_link"
	| "phone"
	| "whatsapp"
	| "internal_redirect"
	| "info_only"

export type ServiceRequestStatus =
	| "pending"
	| "in_progress"
	| "resolved"
	| "rejected"
	| "cancelled"

export type FieldType =
	| "text"
	| "textarea"
	| "select"
	| "file"
	| "checkbox"
	| "date"
	| "number"
	| "rating"

export interface ServiceTypeFieldOption {
	value: string
	label: {
		en: string
		ar: string
	}
}

export interface ServiceTypeField {
	id: number
	key: string
	label: string
	placeholder?: string
	type: FieldType
	options?: Array<{ value: string; label: string }>
	validation?: Record<string, unknown> | null
	is_required: boolean
	is_active?: boolean
	order?: number
}

export interface ServiceTypeFieldPayload {
	key: string
	label: { en: string; ar: string }
	placeholder?: { en: string; ar: string } | null
	type: FieldType
	options?: ServiceTypeFieldOption[] | null
	/** What FormFieldsBuilder writes; the response type above stays loose for legacy rows. */
	validation?: FieldValidation | null
	is_required?: boolean
	is_active?: boolean
	order?: number
}

export interface ServiceAxis {
	id: number
	slug: string
	name: string
	color?: string
	service_types?: ServiceType[]
}

export interface ServiceType {
	id: number
	service_axis_id?: number
	slug: string
	name: string
	description?: string
	icon?: string
	/** The cover on its "Explore ADD" card and page. */
	image_url?: string | null
	is_active: boolean
	is_coming_soon: boolean
	/** Whether the member app's home lists it under "Explore ADD". */
	show_on_home?: boolean
	requires_location: boolean
	requires_review: boolean
	visibility?: "member" | "public" | "both"
	request_method: RequestMethod
	request_config?: Record<string, unknown> | null
	allowed_plan_module_ids?: number[] | null
	order?: number
	fields?: ServiceTypeField[]
	/** Admin reads only: each text in both languages, for the edit form (name/description above are in the request's language). */
	translations?: {
		name: { en: string; ar: string }
		description: { en: string; ar: string } | null
		about: { en: string; ar: string } | null
	}
}

export interface ServiceTypePayload {
	service_axis_id: number
	slug: string
	name: { en: string; ar: string }
	description?: { en: string; ar: string } | null
	/** The "Explore ADD" page: HTML the app renders, per language. */
	about?: { en: string; ar: string } | null
	icon?: string | null
	image_url?: string | null
	is_active?: boolean
	is_coming_soon?: boolean
	show_on_home?: boolean
	requires_location?: boolean
	requires_review?: boolean
	visibility?: "member" | "public" | "both"
	request_method: RequestMethod
	request_config?: Record<string, unknown> | null
	allowed_plan_module_ids?: number[] | null
	order?: number
}

export interface ServiceRequestValueItem {
	field_key?: string
	value: unknown
}

export interface ServiceRequest {
	id: number
	service_type?: ServiceType
	status: ServiceRequestStatus
	location_source?: "qr" | "manual" | "none"
	branch?: {
		id: number
		name: string
	} | null
	space?: {
		id: number
		name: string
	} | null
	resolution_note?: string | null
	values?: ServiceRequestValueItem[]
	submitted_at: string
	updated_at: string
}

export interface UpdateServiceRequestStatusPayload {
	status: ServiceRequestStatus
	resolution_note?: {
		en?: string
		ar?: string
	}
}

export interface ServiceRequestQueryParams {
	page?: number
	branch_id?: number
	status?: ServiceRequestStatus | string
	service_type_id?: number
}
