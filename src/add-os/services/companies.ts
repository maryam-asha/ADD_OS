import type { Company, CompanyPayload, CompanyStatusPayload } from "@/add-os/modules/members/types/company"
import type { MessageResponse } from "./resource-factory"
import { get, patch, post } from "./api"

const BASE = "/api/v1/admin/companies"

export async function listCompanies(): Promise<Company[]> {
	const res = await get<{ data: Company[] }>(BASE)
	return res.data
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
