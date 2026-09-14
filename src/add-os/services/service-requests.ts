import type { Paginated, RawPaginatedResponse } from "./pagination"
import type { MessageResponse } from "./resource-factory"
import type {
	ServiceRequest,
	ServiceRequestQueryParams,
	UpdateServiceRequestStatusPayload
} from "@/add-os/modules/operations/types/service"
import { get, patch } from "./api"
import { toPaginated } from "./pagination"

const BASE = "/api/v1/admin/service-requests"

export async function listServiceRequests(
	query?: ServiceRequestQueryParams
): Promise<ServiceRequest[]> {
	const res = await get<RawPaginatedResponse<ServiceRequest>>(BASE, query as Record<string, unknown>)
	return res.data
}

export async function listServiceRequestsPage(
	query?: ServiceRequestQueryParams
): Promise<Paginated<ServiceRequest>> {
	const res = await get<RawPaginatedResponse<ServiceRequest>>(BASE, query as Record<string, unknown>)
	return toPaginated(res)
}

export async function getServiceRequest(id: number): Promise<ServiceRequest> {
	const res = await get<{ data: ServiceRequest }>(`${BASE}/${id}`)
	return res.data
}

export async function updateServiceRequestStatus(
	id: number,
	payload: UpdateServiceRequestStatusPayload
): Promise<MessageResponse> {
	return patch<MessageResponse>(`${BASE}/${id}`, payload)
}
