import type { Paginated, RawPaginatedResponse } from "./pagination"
import type { Membership, MembershipActivationPayload, MembershipListFilter } from "@/add-os/modules/members/types/membership"
import { get, post, put } from "./api"
import { toPaginated } from "./pagination"

const BASE = "/api/v1/admin/memberships"

/**
 * Activates a plan for a member or company with no wallet debit.
 *
 * Admin-only on the backend (`role:admin`, not `admin|operations`), so an
 * operations account gets a 403 here — the page gates the control the same
 * way rather than letting the request be the first thing that says no.
 */
export async function activateMembership(payload: MembershipActivationPayload): Promise<Membership> {
	const res = await post<{ data: Membership }>(BASE, payload)
	return res.data
}

/**
 * Subscriptions, newest first, each with its owner's name and its desks
 * (backend docs/decisions/coworking-seat-pool.md). `without_desk` finds the
 * Dedicated Desk plans bought in the app that are still owed a desk.
 */
export async function listMemberships(filter: MembershipListFilter = {}): Promise<Paginated<Membership>> {
	return toPaginated(await get<RawPaginatedResponse<Membership>>(BASE, { ...filter }))
}

/**
 * Ties a Dedicated Desk subscription to its desks, replacing any it had; an
 * empty list unties them all. A 422 on `seat_desk_ids` says why not.
 */
export async function assignMembershipDesks(id: number, seatDeskIds: number[]): Promise<{ message: string }> {
	return put<{ message: string }>(`${BASE}/${id}/desks`, { seat_desk_ids: seatDeskIds })
}
