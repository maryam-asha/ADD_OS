import type { SessionType } from "@/add-os/modules/booking/types/reception"
import type { Member } from "@/add-os/modules/members/types/member"

/**
 * One member's whole file (`GET /api/v1/admin/members/{id}/…`). Every
 * instant is district wall-clock with its offset, as the server sends it.
 */

/** `…/summary` — the profile's header. */
export interface MemberProfileSummary {
	member: Member
	joined_at: string | null
	last_visit_at: string | null
	profile: MemberFullProfile
	wallet: {
		/** The general pool — what pays for anything. */
		points: number
		categories: { category: string, label: string, points: number }[]
	}
	outstanding: { points: number, amount: { value: string, currency: string }, items: number }
	membership: { id: number, plan: string | null, period_end: string | null, hours_remaining: number | null } | null
	/** Inside right now, or null. */
	open_session: { type: SessionType, id: number, space: string | null, checked_in_at: string } | null
	counts: {
		bookings: number
		upcoming_bookings: number
		sessions: number
		points_spent: number
		service_requests: number
		event_registrations: number
	}
}

/** Everything the member told us, and everything their account holds. */
export interface MemberFullProfile {
	account: {
		phone: string
		email: string | null
		preferred_language: string | null
		preferred_currency: string | null
		status: string
		roles: string[]
		joined_at: string | null
		updated_at: string | null
	}
	personal: { bio: string | null, city: string | null, gender: "male" | "female" | null, avatar_url: string | null }
	professional: { job_title: string | null, company_name: string | null, industry: string | null }
	links: { linkedin_url: string | null, instagram_url: string | null, behance_url: string | null, website_url: string | null }
	companies: { id: number, legal_name: string, status: string, is_admin: boolean, door_access_enabled: boolean, joined_at: string | null }[]
	branches: { id: number, name: string | null, is_home_branch: boolean }[]
	privacy_policy_agreed_at: string | null
	devices: { platform: string | null, last_used_at: string | null }[]
}

/** `…/sessions` — walk-ins and checked-in bookings, newest first. */
export interface MemberSession {
	type: SessionType
	id: number
	reference: string | null
	space: { id: number | null, name: string | null }
	checked_in_at: string
	checked_out_at: string | null
	duration_seconds: number
	plan_covered_seconds: number
	price_points: number | null
	payment_state: "paid" | "unpaid" | null
	payment_method: string | null
	termination_source: string | null
}

/** `…/wallet-transactions` — one row as the member's own app shows it. */
export interface MemberWalletTransaction {
	id: number
	type: "credit" | "debit"
	kind: string
	kind_label: string
	title: string
	/** Signed: negative is a spend. */
	points: number
	category: string
	category_label: string
	method: string | null
	method_label: string | null
	created_at: string
}

/** `…/memberships` — their own subscriptions and their companies'. */
export interface MemberMembership {
	id: number
	plan: { id: number, name: string | null }
	via: "personal" | "company"
	company: { id: number, name: string | null } | null
	status: string
	seats: number | null
	desks: { code: string, label: string | null }[]
	current_period_start: string | null
	current_period_end: string | null
}

/** `…/service-requests` — the ServiceRequestResource rows. */
export interface MemberServiceRequest {
	id: number
	reference: string | null
	service_name: string | null
	status: string
	submitted_at: string | null
	processed_at: string | null
	resolution_note: string | null
}

/** `…/event-registrations`. */
export interface MemberEventRegistration {
	id: number
	event: { id: number | null, title: string | null, start_at: string | null }
	status: string
	attended: boolean
	price_points: number
	payment_state: "paid" | "unpaid" | null
	registered_at: string | null
	checked_in_at: string | null
}

/** `GET /api/v1/admin/payments?user_id=` — the fields the profile shows. */
export interface MemberPayment {
	id: number
	status: string
	purpose: string
	method: string
	amount_points: number | null
	points_to_credit: number | null
	created_at: string | null
}
