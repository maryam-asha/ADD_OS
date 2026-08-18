import type {
	AddCompanyMemberPayload,
	CompanyMember,
	UpdateAdminFlagPayload,
	UpdateDoorAccessPayload
} from "@/add-os/modules/members/types/company-member"
import type { MessageResponse } from "./resource-factory"
import { del, get, patch, post } from "./api"

/**
 * Built as a factory bound to one companyId — no caller string-concatenates
 * `/companies/${id}/members` by hand; every path is assembled once, here.
 */
export function createCompanyMembersApi(companyId: number) {
	const BASE = `/api/v1/admin/companies/${companyId}/members`

	return {
		list: async (): Promise<CompanyMember[]> => {
			const res = await get<{ data: CompanyMember[] }>(BASE)
			return res.data
		},
		add: async (payload: AddCompanyMemberPayload): Promise<CompanyMember> => {
			const res = await post<{ data: CompanyMember }>(BASE, payload)
			return res.data
		},
		updateDoorAccess: (userId: number, payload: UpdateDoorAccessPayload): Promise<MessageResponse> =>
			patch<MessageResponse>(`${BASE}/${userId}`, payload),
		updateAdminFlag: (userId: number, payload: UpdateAdminFlagPayload): Promise<MessageResponse> =>
			patch<MessageResponse>(`${BASE}/${userId}/admin`, payload),
		remove: (userId: number): Promise<MessageResponse> => del<MessageResponse>(`${BASE}/${userId}`)
	}
}
