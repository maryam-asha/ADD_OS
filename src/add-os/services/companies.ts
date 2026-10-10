import type { MessageResponse } from "./resource-factory"
import type { Company, CompanyPayload, CompanyStatusPayload } from "@/add-os/modules/members/types/company"
import { get, patch, post } from "./api"
import { rowsOf } from "./pagination"

const BASE = "/api/v1/admin/companies"

import type { Paginated } from "./pagination"

export async function listCompanies(): Promise<Company[]> {
	const res = await get<{ data: Company[] }>(BASE)
	return rowsOf<Company>(res.data)
}

export async function listCompaniesPaginated(query?: Record<string, unknown>): Promise<Paginated<Company>> {
	return get<Paginated<Company>>(BASE, query)
}

export async function getCompany(id: number): Promise<Company> {
	const res = await get<{ data: Company }>(`${BASE}/${id}`)
	return res.data
}

export async function createCompany(payload: CompanyPayload): Promise<Company> {
	const res = await post<{ data: Company }>(BASE, payload)
	return res.data
}

export async function updateCompanyStatus(id: number, payload: CompanyStatusPayload): Promise<MessageResponse> {
	return patch<MessageResponse>(`${BASE}/${id}/status`, payload)
}

export async function transferCompanyProvider(companyId: number, providerId: number | null): Promise<MessageResponse> {
	return patch<MessageResponse>(`${BASE}/${companyId}/provider`, { provider_id: providerId })
}
