import type { EventCategory } from "./event-category"
import type { Bilingual } from "@/add-os/components/resource/field-types"

export type EventStatus = "draft" | "published" | "cancelled"

export interface Event {
	id: number
	branch_id?: number | null
	category_id?: number | null
	title: Bilingual
	description?: Bilingual | null
	category?: EventCategory | null
	start_at: string
	end_at: string
	location?: string | null
	capacity?: number | null
	/** Registrations wait for an operator instead of being admitted outright. */
	requires_approval: boolean
	/** Whether the event asks its own questions at registration. */
	has_registration_form: boolean
	is_free: boolean
	/** Authoritative price. Whole points — everything below is derived from it. */
	price_points: number
	/** Display-ready, already localised: "50 pts" / "50 نقطة", or "Free" when free. */
	price_label: string
	price_usd: string
	price_display: string
	/** Display-ready with the currency symbol: "73,500.01 ل.س". */
	price_display_label: string
	currency: string
	/** True instant with an offset. Render through formatDateTime, never raw. */
	start_time?: string | null
	end_time?: string | null
	timezone?: string
	image_url?: string | null
	status: EventStatus
	order: number
	created_at: string
}

export interface EventPayload extends Record<string, unknown> {
	branch_id?: number | null
	category_id?: number | null
	title: Bilingual
	description?: Bilingual
	start_at: string
	end_at: string
	location?: string
	capacity?: number | null
	requires_approval?: boolean
	is_free?: boolean
	/** Whole points. The backend rejects a fractional value with a 422. */
	price_points?: number | null
	image_url?: string
	status: EventStatus
	order: number
}

/** Where one member's registration stands. */
export type EventRegistrationStatus = "pending" | "approved" | "rejected"

export interface EventAttendeeAnswer {
	field_key: string
	label?: string | null
	value: unknown
}

export interface EventAttendee {
	id: number
	event_id: number
	user_id: number | null
	name: string
	email: string
	phone?: string | null
	status: EventRegistrationStatus
	rejection_reason?: string | null
	attended?: boolean | null
	approved_by?: number | null
	approved_at?: string | null
	registered_at?: string | null
	answers?: EventAttendeeAnswer[]
}

export type EventFieldType =
	| "text"
	| "textarea"
	| "select"
	| "file"
	| "checkbox"
	| "date"
	| "number"
	| "rating"

export interface EventFieldOption {
	value: string
	label: Bilingual
}

/**
 * One question on an event's registration form.
 *
 * `key` is never name, phone or email: identity comes from the member's
 * account and the API refuses a reserved key with a 422.
 */
export interface EventRegistrationField {
	id: number
	key: string
	label: string
	placeholder?: string | null
	type: EventFieldType
	options?: { value: string, label: string }[]
	validation?: Record<string, unknown> | null
	is_required: boolean
	is_active: boolean
	order: number
}

export interface EventRegistrationFieldPayload extends Record<string, unknown> {
	key: string
	label: Bilingual
	placeholder?: Bilingual | null
	type: EventFieldType
	options?: EventFieldOption[] | null
	validation?: Record<string, unknown> | null
	is_required?: boolean
	is_active?: boolean
	order?: number
}
