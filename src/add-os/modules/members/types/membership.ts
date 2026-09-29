import type { Plan } from "@/add-os/modules/plans/types/plan"

export type MembershipStatus = "active" | "expired" | "cancelled"

export type MembershipOwnerType = "user" | "company"

/**
 * A subscription held by a member or a company.
 *
 * There are two ways one comes into existence, and they differ in who pays:
 * a member buys a plan from the app, which debits their wallet, or operations
 * activates one from this dashboard, which debits nothing — the arrangement
 * was paid for outside the app. Only the second is reachable from here.
 */
export interface Membership {
	id: number
	plan_id: number
	plan?: Plan | null
	owner_type: MembershipOwnerType
	owner_id: number
	/** The branch whose co-working pool it holds its seats in. */
	branch_id: number | null
	/** Seats it holds while its plan is open — 1 for a member, as sold for a company. */
	seats: number
	/** A Dedicated Desk subscription's desks, by the code its member is told. */
	desks?: { id: number, code: string, label: string }[]
	/** Only on the staff list, which names owners in bulk. */
	owner?: { type: MembershipOwnerType, id: number, name: string | null }
	status: MembershipStatus
	current_period_start: string
	current_period_end: string
}

/**
 * `POST /api/v1/admin/memberships` — activating a plan for someone without
 * charging them.
 *
 * Exactly one of `user_id` / `company_id`: the backend pairs them with
 * `required_without` and `prohibits`, so sending both is a 422 by design
 * rather than a precedence question this client gets to answer.
 *
 * Deliberately no `is_public` filter on the plan chosen here — assigning a
 * private plan to the staff it was negotiated for is the entire reason this
 * endpoint exists.
 */
export interface MembershipActivationPayload extends Record<string, unknown> {
	plan_id: number
	user_id?: number
	company_id?: number
	/**
	 * The branch whose co-working seats it holds. Left out, the server picks
	 * the company's branch, else the member's home branch, else the default.
	 */
	branch_id?: number
	/** A company only; a member's own subscription is always one seat. */
	seats?: number
	/**
	 * Sell even though the branch's co-working seats are all held for part
	 * of the plan's period — by arrangement, and recorded in the audit log.
	 */
	override_capacity?: boolean
	/**
	 * A Dedicated Desk plan's desks, at most one per seat, each free and in a
	 * co_space of the subscription's branch — the server refuses otherwise.
	 */
	seat_desk_ids?: number[]
}

/** `GET /api/v1/admin/memberships` filters. */
export interface MembershipListFilter {
	dedicated?: 1
	live?: 1
	without_desk?: 1
	branch_id?: number
	page?: number
	per_page?: number
}

/**
 * The 422 when the branch has no seat left for the subscription: the
 * server's sentence and the first moment it no longer fits.
 */
export interface SeatPoolFullError {
	message: string
	first_shortfall_at: string
}
