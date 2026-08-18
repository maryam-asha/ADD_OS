import type { MessageResponse } from "./resource-factory"
import type {
	MarkAsQuotedPayload,
	PrivateOfficeRequest,
	PrivateOfficeRequestPayload
} from "@/add-os/modules/members/types/private-office-request"
import { del, get, post, put } from "./api"

const BASE = "/api/v1/admin/private-office-requests"

export async function listPrivateOfficeRequests(): Promise<PrivateOfficeRequest[]> {
	const res = await get<{ data: PrivateOfficeRequest[] }>(BASE)
	return res.data
}

export async function getPrivateOfficeRequest(id: number): Promise<PrivateOfficeRequest> {
	const res = await get<{ data: PrivateOfficeRequest }>(`${BASE}/${id}`)
	return res.data
}

export async function createPrivateOfficeRequest(payload: PrivateOfficeRequestPayload): Promise<PrivateOfficeRequest> {
	const res = await post<{ data: PrivateOfficeRequest }>(BASE, payload)
	return res.data
}

/**
 * Bakes in the one real status transition this UI performs — see the
 * MarkAsQuotedPayload doc comment in types/private-office-request.ts.
 */
export async function markPrivateOfficeRequestAsQuoted(id: number, payload: MarkAsQuotedPayload): Promise<MessageResponse> {
	return put<MessageResponse>(`${BASE}/${id}`, { status: "quoted", quote_ref: payload.quote_ref })
}

export async function removePrivateOfficeRequest(id: number): Promise<MessageResponse> {
	return del<MessageResponse>(`${BASE}/${id}`)
}
