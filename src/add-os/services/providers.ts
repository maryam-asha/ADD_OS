
import type { Provider } from "@/add-os/modules/providers/types"
import { get, post, patch, del } from "./api"

export async function listProviders(query?: Record<string, unknown>): Promise<Provider[]> {
	const res = await get<{ data: Provider[] }>("/api/v1/admin/providers", query)
	return res.data
}

export async function getProvider(id: number): Promise<Provider> {
	const res = await get<{ data: Provider }>(`/api/v1/admin/providers/${id}`)
	return res.data
}

export async function createProvider(payload: { name: string; contract_ref: string; payment_terms_days?: number | null }): Promise<Provider> {
	const res = await post<{ data: Provider }>("/api/v1/admin/providers", payload)
	return res.data
}

/** Update endpoints answer with a message, not the resource (CLAUDE.md, ADD Core). */
export async function updateProvider(id: number, payload: { name?: string; contract_ref?: string; payment_terms_days?: number | null }): Promise<void> {
	await patch(`/api/v1/admin/providers/${id}`, payload)
}

export async function updateProviderStatus(id: number, status: "active" | "inactive"): Promise<void> {
	await patch(`/api/v1/admin/providers/${id}/status`, { status })
}

export async function linkProviderUser(id: number, userId: number): Promise<void> {
	await post(`/api/v1/admin/providers/${id}/users/${userId}`)
}

export async function unlinkProviderUser(id: number, userId: number): Promise<void> {
	await del(`/api/v1/admin/providers/${id}/users/${userId}`)
}
