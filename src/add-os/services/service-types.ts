import type { MessageResponse } from "./resource-factory"
import type {
	ServiceType,
	ServiceTypeField,
	ServiceTypeFieldPayload,
	ServiceTypePayload
} from "@/add-os/modules/operations/types/service"
import { del, get, patch, post } from "./api"
import { rowsOf } from "./pagination"

const BASE = "/api/v1/admin/service-types"

// ── Service Types ────────────────────────────────────────────────────────────

export async function listServiceTypes(): Promise<ServiceType[]> {
	const res = await get<{ data: ServiceType[] }>(BASE)
	return rowsOf<ServiceType>(res.data)
}

export async function getServiceType(id: number): Promise<ServiceType> {
	const res = await get<{ data: ServiceType }>(`${BASE}/${id}`)
	return res.data
}

export async function createServiceType(payload: ServiceTypePayload): Promise<ServiceType> {
	const res = await post<{ data: ServiceType }>(BASE, payload)
	return res.data
}

export async function updateServiceType(
	id: number,
	payload: Partial<ServiceTypePayload>
): Promise<MessageResponse> {
	return patch<MessageResponse>(`${BASE}/${id}`, payload)
}

export async function removeServiceType(id: number): Promise<MessageResponse> {
	return del<MessageResponse>(`${BASE}/${id}`)
}

// ── Service Type Fields ──────────────────────────────────────────────────────

export async function listServiceTypeFields(serviceTypeId: number): Promise<ServiceTypeField[]> {
	const res = await get<{ data: ServiceTypeField[] }>(`${BASE}/${serviceTypeId}/fields`)
	return rowsOf<ServiceTypeField>(res.data)
}

export async function createServiceTypeField(
	serviceTypeId: number,
	payload: ServiceTypeFieldPayload
): Promise<ServiceTypeField> {
	const res = await post<{ data: ServiceTypeField }>(`${BASE}/${serviceTypeId}/fields`, payload)
	return res.data
}

export async function updateServiceTypeField(
	serviceTypeId: number,
	fieldId: number,
	payload: Partial<ServiceTypeFieldPayload>
): Promise<MessageResponse> {
	return patch<MessageResponse>(`${BASE}/${serviceTypeId}/fields/${fieldId}`, payload)
}

export async function removeServiceTypeField(
	serviceTypeId: number,
	fieldId: number
): Promise<MessageResponse> {
	return del<MessageResponse>(`${BASE}/${serviceTypeId}/fields/${fieldId}`)
}
