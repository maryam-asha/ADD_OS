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
}
