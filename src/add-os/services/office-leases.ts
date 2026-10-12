import type { Paginated } from "./pagination"
import type { OfficeLease, OfficeLeaseFilterQuery, TerminateLeasePayload } from "@/add-os/modules/members/types/office-lease"
import { get, patch, post } from "./api"

const BASE = "/api/v1/admin/office-leases"

export function listOfficeLeases(query?: OfficeLeaseFilterQuery): Promise<Paginated<OfficeLease>> {
	return get<Paginated<OfficeLease>>(BASE, query as Record<string, unknown> | undefined)
}

export async function getOfficeLease(id: number): Promise<OfficeLease> {
	const res = await get<{ data: OfficeLease }>(`${BASE}/${id}`)
	return res.data
}

export { createLeaseFromRequest } from "./private-office-requests"

export function terminateOfficeLease(id: number, payload: TerminateLeasePayload): Promise<{ message: string }> {
	return post<{ message: string }>(`${BASE}/${id}/terminate`, payload)
}

export function renewOfficeLease(id: number): Promise<{ message: string }> {
	return post<{ message: string }>(`${BASE}/${id}/renew`)
}

export function setOfficeLeaseAutoRenew(id: number, auto_renew: boolean): Promise<{ message: string }> {
	return patch<{ message: string }>(`${BASE}/${id}/auto-renew`, { auto_renew })
}
