import type { EventCategory } from "./event-category"
import type { Bilingual } from "@/add-os/components/resource/field-types"

export type EventStatus = "draft" | "published" | "cancelled"

// ── Member-facing structured date/time objects ──────────────────────────────

/**
 * Structured date object returned by the member API.
 * For single-day events only `month/day/weekday/formatted` are present.
 * Multi-day events add the `end_*` counterparts.
 */
export interface EventDateObject {
	month: string       // "SEP"
	day: string         // "10"
	weekday: string     // "THU"
	formatted: string   // "September 10, 2026"
	end_month?: string
	end_day?: string
	end_weekday?: string
	end_formatted?: string
}

export interface EventTimeObject {
	start: string   // "04:00 AM"
	end: string     // "05:30 AM"
	range: string   // "04:00 AM – 05:30 AM"
}

// ── Admin session (ISO instants) / Member session (structured) ───────────────

/**
 * One sitting of an event: a day, a track, a session.
 *
 * An event whose hours differ per day is several of these. The event's own
 * start_at/end_at stay the envelope around them — derived by the backend, not
 * typed — so a screen that only reads those keeps working.
 */
export interface EventSession {
	id?: number
	/** An instant with its offset, as the admin API returns and accepts it. */
	start_at: string
	end_at: string
	sessions?: EventSession[]
	title?: Bilingual | null
}

/** Session shape returned to member-facing clients (structured date + time). */
export interface MemberEventSession {
	id?: number
	title?: string | null
	start_at: string   // "Y-m-d" local calendar day
	end_at: string
	start_time: string // "H:i" 24-h
	end_time: string
	date: EventDateObject
	time: EventTimeObject
}

/** A session as the editor holds it: epoch ms, which n-date-picker binds. */
export interface DraftSession {
	start: number | null
	end: number | null
}

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
	/**
	 * Registration happens on someone else's form. When set, the member is
	 * sent there instead: no seat, no approval, no points, and nothing in our
	 * attendee roster — the backend refuses in-app registration outright.
	 */
	external_form_url?: string | null
	/**
	 * When members may register. Null opens it on publication / closes it
	 * when the event starts — the backend never takes a registration once
	 * the event is under way, and refuses a close set after the start.
	 */
	registration_opens_at?: string | null
	registration_closes_at?: string | null
	/**
	 * The admin's word that no places are left — the only "full" an external
	 * event can have. Members see "full" and the external link is withheld.
	 */
	is_marked_full?: boolean
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
	/** Loaded sessions — only present when the API includes them (e.g. getById). */
	sessions?: EventSession[]
	is_same_time?: boolean
	is_continuous?: boolean
	schedule?: Array<{ date: string; start_time: string; end_time: string }>
}

/** Where members register: on our own form, or on someone else's link. */
export type EventRegistrationSource = "internal" | "external"

export interface EventPayload extends Record<string, unknown> {
	/**
	 * Editor-only: chosen explicitly so "external" can insist on a link. Not
	 * sent — the API reads the source from whether external_form_url is set.
	 */
	registration_source?: EventRegistrationSource
	branch_id?: number | null
	category_id?: number | null
	title: Bilingual
	description?: Bilingual
	start_at?: string
	end_at?: string
	sessions?: EventSession[]
	location?: string
	capacity?: number | null
	requires_approval?: boolean
	external_form_url?: string | null
	registration_opens_at?: string | null
	registration_closes_at?: string | null
	is_marked_full?: boolean
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
