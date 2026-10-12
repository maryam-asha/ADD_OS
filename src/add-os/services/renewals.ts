import type { Paginated } from "./pagination"
import type { StoppedRenewalRow, StoppedRenewalsFilterQuery } from "@/add-os/modules/members/types/renewal"
import { get, patch, post } from "./api"

export function listStoppedRenewals(query?: StoppedRenewalsFilterQuery): Promise<Paginated<StoppedRenewalRow>> {
	return get<Paginated<StoppedRenewalRow>>("/api/v1/admin/renewals/stopped", query as Record<string, unknown> | undefined)
}

export function renewMembership(id: number): Promise<{ message: string }> {
	return post<{ message: string }>(`/api/v1/admin/memberships/${id}/renew`)
}

export function renewOfficeLease(id: number): Promise<{ message: string }> {
	return post<{ message: string }>(`/api/v1/admin/office-leases/${id}/renew`)
}

export function setMembershipAutoRenew(id: number, auto_renew: boolean): Promise<{ message: string }> {
	return patch<{ message: string }>(`/api/v1/admin/memberships/${id}/auto-renew`, { auto_renew })
}

export function setOfficeLeaseAutoRenew(id: number, auto_renew: boolean): Promise<{ message: string }> {
	return patch<{ message: string }>(`/api/v1/admin/office-leases/${id}/auto-renew`, { auto_renew })
}
