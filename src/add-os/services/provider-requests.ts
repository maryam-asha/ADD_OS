import type { Paginated } from "./pagination"
import type { ApproveProviderRequestPayload, ProviderRequest } from "@/add-os/modules/providers/types"
import { get, post } from "./api"

export async function listProviderRequests(query?: Record<string, unknown>): Promise<Paginated<ProviderRequest>> {
	return get<Paginated<ProviderRequest>>("/api/v1/admin/provider-requests", query)
}

export async function getProviderRequest(id: number): Promise<ProviderRequest> {
	const res = await get<{ data: ProviderRequest }>(`/api/v1/admin/provider-requests/${id}`)
	return res.data
}

export async function approveProviderRequest(id: number, payload?: ApproveProviderRequestPayload): Promise<void> {
	await post(`/api/v1/admin/provider-requests/${id}/approve`, payload || {})
}

export async function rejectProviderRequest(id: number, reason: string): Promise<void> {
	await post(`/api/v1/admin/provider-requests/${id}/reject`, { reason })
}
