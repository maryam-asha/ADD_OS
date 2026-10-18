/**
 * HR approvals under `/api/v1/hr`: flows and the override queue need
 * hr.approvals.manage; `hr/me/approvals` answers whoever a request waits for
 * (approver, delegate, or holder of the ability a step asks for), and a
 * request they cannot decide answers 404. Decisions answer `{message}`.
 *
 * Routes, rules and shapes read from ADD Core
 * `packages/add/hr/routes/approvals/{admin,self}.php` and
 * `src/Approvals/Http/{Requests,Resources}`.
 */

import type { Paginated, RawPaginatedResponse } from "../pagination"
import type { UpdateResult } from "./core"
import type { ApprovalFlow, ApprovalFlowPayload, ApprovalRequest, ApprovalStatus, Delegation, DelegationPayload } from "@/add-os/modules/hr/types/approvals"
import { del, get, patch, post } from "../api"
import { rowsOf, toPaginated } from "../pagination"

const BASE = "/api/v1/hr"

// ── Flows ───────────────────────────────────────────────────────────────────

/** The request types a flow can be defined for. */
export async function listApprovalTypes(): Promise<string[]> {
	return rowsOf<string>((await get<{ data: string[] }>(`${BASE}/approval-types`)).data)
}

export async function listApprovalFlows(): Promise<ApprovalFlow[]> {
	return rowsOf<ApprovalFlow>((await get<{ data: ApprovalFlow[] }>(`${BASE}/approval-flows`)).data)
}

export async function createApprovalFlow(payload: ApprovalFlowPayload): Promise<ApprovalFlow> {
	return (await post<{ data: ApprovalFlow }>(`${BASE}/approval-flows`, payload)).data
}

/** The request type is fixed once created; name, steps and the switch can change. */
export async function updateApprovalFlow(id: number, payload: Omit<ApprovalFlowPayload, "request_type">): Promise<UpdateResult> {
	return patch<UpdateResult>(`${BASE}/approval-flows/${id}`, payload)
}

/** Without a flow the type goes back to the direct manager alone. */
export async function deleteApprovalFlow(id: number): Promise<void> {
	await del<void>(`${BASE}/approval-flows/${id}`)
}

// ── Every request (override) ────────────────────────────────────────────────

export interface ApprovalRequestFilters {
	page?: number
	status?: ApprovalStatus | null
	request_type?: string | null
	employee_id?: number | null
}

export async function listApprovalRequests(filters: ApprovalRequestFilters = {}): Promise<Paginated<ApprovalRequest>> {
	const query: Record<string, unknown> = { page: filters.page ?? 1 }
	if (filters.status) query.status = filters.status
	if (filters.request_type) query.request_type = filters.request_type
	if (filters.employee_id) query.employee_id = filters.employee_id
	return toPaginated(await get<RawPaginatedResponse<ApprovalRequest>>(`${BASE}/approval-requests`, query))
}

export async function getApprovalRequest(id: number): Promise<ApprovalRequest> {
	return (await get<{ data: ApprovalRequest }>(`${BASE}/approval-requests/${id}`)).data
}

/** Recorded as an override; nobody overrides a request of their own. */
export async function overrideApprove(id: number, comment: string | null): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/approval-requests/${id}/approve`, { comment })
}

export async function overrideReject(id: number, comment: string | null): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/approval-requests/${id}/reject`, { comment })
}

// ── My inbox and delegations (hr/me) ────────────────────────────────────────

/** Oldest first. */
export async function listMyApprovals(page = 1): Promise<Paginated<ApprovalRequest>> {
	return toPaginated(await get<RawPaginatedResponse<ApprovalRequest>>(`${BASE}/me/approvals`, { page }))
}

export async function getMyApproval(id: number): Promise<ApprovalRequest> {
	return (await get<{ data: ApprovalRequest }>(`${BASE}/me/approvals/${id}`)).data
}

export async function approveMyApproval(id: number, comment: string | null): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/me/approvals/${id}/approve`, { comment })
}

export async function rejectMyApproval(id: number, comment: string | null): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/me/approvals/${id}/reject`, { comment })
}

/** Current and upcoming ones only. */
export async function listMyDelegations(): Promise<Delegation[]> {
	return rowsOf<Delegation>((await get<{ data: Delegation[] }>(`${BASE}/me/delegations`)).data)
}

export async function createDelegation(payload: DelegationPayload): Promise<Delegation> {
	return (await post<{ data: Delegation }>(`${BASE}/me/delegations`, payload)).data
}

export async function deleteDelegation(id: number): Promise<void> {
	await del<void>(`${BASE}/me/delegations/${id}`)
}
