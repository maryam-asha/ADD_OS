import type { Paginated } from "./pagination"
import type { Provider, ProviderRequest, Invoice } from "@/add-os/modules/providers/types"
import type { Company } from "@/add-os/modules/members/types/company"
import type { PrivateOfficeRequest } from "@/add-os/modules/members/types/private-office-request"
import { get, post, patch, del } from "./api"

export async function getProviderProfile(): Promise<Provider> {
	const res = await get<{ data: Provider }>("/api/v1/provider/profile")
	return res.data
}

export async function getProviderSummary(): Promise<any> {
	const res = await get<{ data: any }>("/api/v1/provider/summary")
	return res.data
}

export async function listProviderCompanies(query?: Record<string, unknown>): Promise<Paginated<Company>> {
	return get<Paginated<Company>>("/api/v1/provider/companies", query)
}

export async function getProviderCompany(id: number): Promise<Company> {
	const res = await get<{ data: Company }>(`/api/v1/provider/companies/${id}`)
	return res.data
}

export async function removeProviderCompanyMember(companyId: number, userId: number): Promise<void> {
	await del(`/api/v1/provider/companies/${companyId}/members/${userId}`)
}

export async function listPortalRequests(query?: Record<string, unknown>): Promise<Paginated<ProviderRequest>> {
	return get<Paginated<ProviderRequest>>("/api/v1/provider/requests", query)
}

export async function getPortalRequest(id: number): Promise<ProviderRequest> {
	const res = await get<{ data: ProviderRequest }>(`/api/v1/provider/requests/${id}`)
	return res.data
}

export async function createPortalRequest(payload: any): Promise<ProviderRequest> {
	const res = await post<{ data: ProviderRequest }>("/api/v1/provider/requests", payload)
	return res.data
}

export async function cancelPortalRequest(id: number): Promise<void> {
	await patch(`/api/v1/provider/requests/${id}/cancel`)
}

export async function listPortalOfficeRequests(query?: Record<string, unknown>): Promise<Paginated<PrivateOfficeRequest>> {
	return get<Paginated<PrivateOfficeRequest>>("/api/v1/provider/office-requests", query)
}

export async function createPortalOfficeRequest(payload: any): Promise<PrivateOfficeRequest> {
	const res = await post<{ data: PrivateOfficeRequest }>("/api/v1/provider/office-requests", payload)
	return res.data
}

export async function listPortalInvoices(query?: Record<string, unknown>): Promise<Paginated<Invoice>> {
	return get<Paginated<Invoice>>("/api/v1/provider/invoices", query)
}

export async function getPortalInvoice(id: number): Promise<Invoice> {
	const res = await get<{ data: Invoice }>(`/api/v1/provider/invoices/${id}`)
	return res.data
}

export async function listPortalPlans(): Promise<any[]> {
	const res = await get<{ data: any[] }>("/api/v1/provider/plans")
	return res.data
}
