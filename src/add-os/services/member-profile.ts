import type { Paginated, RawPaginatedResponse } from "./pagination"
import type {
	MemberEventRegistration,
	MemberMembership,
	MemberPayment,
	MemberProfileSummary,
	MemberServiceRequest,
	MemberSession,
	MemberWalletTransaction
} from "@/add-os/modules/members/types/member-profile"
import { get } from "./api"
import { toPaginated } from "./pagination"

/**
 * One member's whole file for the member profile page. Each tab is its own
 * paginated list; bookings come from `services/booking-calendar.ts`'s
 * `listBookings({ user_id })`, which already filters by member.
 */

const BASE = "/api/v1/admin/members"

export type ProfileQuery = Record<string, unknown>

export async function getMemberSummary(userId: number): Promise<MemberProfileSummary> {
	const res = await get<{ data: MemberProfileSummary }>(`${BASE}/${userId}/summary`)
	return res.data
}

async function page<T>(url: string, query?: ProfileQuery): Promise<Paginated<T>> {
	return toPaginated(await get<RawPaginatedResponse<T>>(url, query))
}

export function listMemberSessions(userId: number, query?: ProfileQuery): Promise<Paginated<MemberSession>> {
	return page(`${BASE}/${userId}/sessions`, query)
}

export function listMemberWalletTransactions(userId: number, query?: ProfileQuery): Promise<Paginated<MemberWalletTransaction>> {
	return page(`${BASE}/${userId}/wallet-transactions`, query)
}

export function listMemberMemberships(userId: number, query?: ProfileQuery): Promise<Paginated<MemberMembership>> {
	return page(`${BASE}/${userId}/memberships`, query)
}

export function listMemberServiceRequests(userId: number, query?: ProfileQuery): Promise<Paginated<MemberServiceRequest>> {
	return page(`${BASE}/${userId}/service-requests`, query)
}

export function listMemberEventRegistrations(userId: number, query?: ProfileQuery): Promise<Paginated<MemberEventRegistration>> {
	return page(`${BASE}/${userId}/event-registrations`, query)
}

/** Everything the member paid, by any method, newest first. */
export function listMemberPayments(userId: number, query?: ProfileQuery): Promise<Paginated<MemberPayment>> {
	return page("/api/v1/admin/payments", { ...query, user_id: userId })
}
