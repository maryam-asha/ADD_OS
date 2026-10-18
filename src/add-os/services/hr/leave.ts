/**
 * HR leave under `/api/v1/hr`. Settings (types, policies, holidays,
 * coverage) read with hr.leave.view and write with hr.settings.manage;
 * requests and balances read with hr.leave.view; filing, cancelling and
 * adjusting for an employee need hr.leave.manage. `hr/me/leave` is the
 * employee's own, and `hr/me/team/leave` their direct reports'.
 *
 * Routes, rules and shapes read from ADD Core
 * `packages/add/hr/routes/leave/{admin,self}.php` and `src/Leave/Http`.
 */

import type { Paginated, RawPaginatedResponse } from "../pagination"
import type { UpdateResult } from "./core"
import type {
	CoverageRule,
	CoverageRulePayload,
	Holiday,
	HolidayPayload,
	LeaveAdjustmentPayload,
	LeaveBalance,
	LeavePolicy,
	LeavePolicyPayload,
	LeaveQuote,
	LeaveRequest,
	LeaveRequestStatus,
	LeaveType,
	LeaveTypePayload,
	LedgerEntry,
	SubmitLeavePayload,
	TeamLeave
} from "@/add-os/modules/hr/types/leave"
import { del, get, patch, post, uploadFile } from "../api"
import { rowsOf, toPaginated } from "../pagination"

const BASE = "/api/v1/hr"

// ── Settings ────────────────────────────────────────────────────────────────

export async function listLeaveTypes(): Promise<LeaveType[]> {
	return rowsOf<LeaveType>((await get<{ data: LeaveType[] }>(`${BASE}/leave-types`)).data)
}

export async function createLeaveType(payload: LeaveTypePayload): Promise<LeaveType> {
	return (await post<{ data: LeaveType }>(`${BASE}/leave-types`, payload)).data
}

export async function updateLeaveType(id: number, payload: Partial<LeaveTypePayload>): Promise<UpdateResult> {
	return patch<UpdateResult>(`${BASE}/leave-types/${id}`, payload)
}

/** 409 once the type has policies, requests or balances — deactivate it instead. */
export async function deleteLeaveType(id: number): Promise<UpdateResult> {
	await del<void>(`${BASE}/leave-types/${id}`)
	return {}
}

export async function listLeavePolicies(leaveTypeId?: number | null): Promise<LeavePolicy[]> {
	const query = leaveTypeId ? { leave_type_id: leaveTypeId } : undefined
	return rowsOf<LeavePolicy>((await get<{ data: LeavePolicy[] }>(`${BASE}/leave-policies`, query)).data)
}

export async function createLeavePolicy(payload: LeavePolicyPayload): Promise<LeavePolicy> {
	return (await post<{ data: LeavePolicy }>(`${BASE}/leave-policies`, payload)).data
}

export async function updateLeavePolicy(id: number, payload: Partial<LeavePolicyPayload>): Promise<UpdateResult> {
	return patch<UpdateResult>(`${BASE}/leave-policies/${id}`, payload)
}

/** Accruals already booked stay in the ledger; only future ones stop. */
export async function deleteLeavePolicy(id: number): Promise<void> {
	await del<void>(`${BASE}/leave-policies/${id}`)
}

/** With a year: that year's holidays and every recurring one. */
export async function listHolidays(year?: number | null): Promise<Holiday[]> {
	return rowsOf<Holiday>((await get<{ data: Holiday[] }>(`${BASE}/holidays`, year ? { year } : undefined)).data)
}

export async function createHoliday(payload: HolidayPayload): Promise<Holiday> {
	return (await post<{ data: Holiday }>(`${BASE}/holidays`, payload)).data
}

export async function updateHoliday(id: number, payload: Partial<HolidayPayload>): Promise<UpdateResult> {
	return patch<UpdateResult>(`${BASE}/holidays/${id}`, payload)
}

export async function deleteHoliday(id: number): Promise<UpdateResult> {
	await del<void>(`${BASE}/holidays/${id}`)
	return {}
}

export async function listCoverageRules(): Promise<CoverageRule[]> {
	return rowsOf<CoverageRule>((await get<{ data: CoverageRule[] }>(`${BASE}/coverage-rules`)).data)
}

export async function createCoverageRule(payload: CoverageRulePayload): Promise<CoverageRule> {
	return (await post<{ data: CoverageRule }>(`${BASE}/coverage-rules`, payload)).data
}

/** Only the minimum and the switch change; the unit or position is fixed. */
export async function updateCoverageRule(id: number, payload: Pick<CoverageRulePayload, "min_present" | "is_active">): Promise<UpdateResult> {
	return patch<UpdateResult>(`${BASE}/coverage-rules/${id}`, payload)
}

export async function deleteCoverageRule(id: number): Promise<UpdateResult> {
	await del<void>(`${BASE}/coverage-rules/${id}`)
	return {}
}

// ── Requests ────────────────────────────────────────────────────────────────

export interface LeaveRequestFilters {
	page?: number
	status?: LeaveRequestStatus | null
	employee_id?: number | null
	leave_type_id?: number | null
	/** Requests ending on or after. */
	from?: string | null
	/** Requests starting on or before. */
	to?: string | null
}

export async function listLeaveRequests(filters: LeaveRequestFilters = {}): Promise<Paginated<LeaveRequest>> {
	const query: Record<string, unknown> = { page: filters.page ?? 1 }
	for (const key of ["status", "employee_id", "leave_type_id", "from", "to"] as const) {
		if (filters[key]) query[key] = filters[key]
	}
	return toPaginated(await get<RawPaginatedResponse<LeaveRequest>>(`${BASE}/leave-requests`, query))
}

export async function getLeaveRequest(id: number): Promise<LeaveRequest> {
	return (await get<{ data: LeaveRequest }>(`${BASE}/leave-requests/${id}`)).data
}

export async function cancelLeaveRequest(id: number): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/leave-requests/${id}/cancel`)
}

/** Approved and pending leave overlapping the range (three months at most). */
export async function leaveCalendar(from: string, to: string, orgUnitId?: number | null): Promise<LeaveRequest[]> {
	const query: Record<string, unknown> = { from, to }
	if (orgUnitId) query.org_unit_id = orgUnitId
	return rowsOf<LeaveRequest>((await get<{ data: LeaveRequest[] }>(`${BASE}/leave-calendar`, query)).data)
}

/**
 * JSON without an attachment; multipart with one (`attachment`), the other
 * fields as form fields — as SubmitLeaveRequest reads them either way.
 */
async function submit(path: string, payload: SubmitLeavePayload): Promise<LeaveRequest> {
	const { attachment, ...fields } = payload
	if (!attachment) return (await post<{ data: LeaveRequest }>(path, fields)).data
	const form: Record<string, string> = {}
	for (const [key, value] of Object.entries(fields)) {
		if (value !== null && value !== undefined && value !== "") form[key] = String(value)
	}
	return (await uploadFile<{ data: LeaveRequest }>(path, attachment, "attachment", form)).data
}

/** Filed by HR for the employee; it still goes through the employee's approval flow. */
export async function submitLeaveForEmployee(employeeId: number, payload: SubmitLeavePayload): Promise<LeaveRequest> {
	return submit(`${BASE}/employees/${employeeId}/leave-requests`, payload)
}

// ── An employee's balances ──────────────────────────────────────────────────

export async function employeeLeaveBalances(employeeId: number): Promise<LeaveBalance[]> {
	return rowsOf<LeaveBalance>((await get<{ data: LeaveBalance[] }>(`${BASE}/employees/${employeeId}/leave-balances`)).data)
}

export async function employeeLeaveLedger(employeeId: number, filters: { page?: number; leave_type_id?: number | null; year?: number | null } = {}): Promise<Paginated<LedgerEntry>> {
	const query: Record<string, unknown> = { page: filters.page ?? 1 }
	if (filters.leave_type_id) query.leave_type_id = filters.leave_type_id
	if (filters.year) query.year = filters.year
	return toPaginated(await get<RawPaginatedResponse<LedgerEntry>>(`${BASE}/employees/${employeeId}/leave-ledger`, query))
}

/** Answers the ledger entry it booked (201). */
export async function adjustLeaveBalance(employeeId: number, payload: LeaveAdjustmentPayload): Promise<LedgerEntry> {
	return (await post<{ data: LedgerEntry }>(`${BASE}/employees/${employeeId}/leave-adjustments`, payload)).data
}

// ── My leave (hr/me) ────────────────────────────────────────────────────────

/** Also the list of types the employee may request. */
export async function myLeaveBalances(): Promise<LeaveBalance[]> {
	return rowsOf<LeaveBalance>((await get<{ data: LeaveBalance[] }>(`${BASE}/me/leave/balances`)).data)
}

export async function myLeaveLedger(filters: { page?: number; leave_type_id?: number | null } = {}): Promise<Paginated<LedgerEntry>> {
	const query: Record<string, unknown> = { page: filters.page ?? 1 }
	if (filters.leave_type_id) query.leave_type_id = filters.leave_type_id
	return toPaginated(await get<RawPaginatedResponse<LedgerEntry>>(`${BASE}/me/leave/ledger`, query))
}

/** What a request would take and leave, without filing it; refusals come as 422 with the reason. */
export async function quoteMyLeave(payload: Omit<SubmitLeavePayload, "attachment" | "reason">): Promise<LeaveQuote> {
	return (await post<{ data: LeaveQuote }>(`${BASE}/me/leave/quote`, payload)).data
}

export async function listMyLeaveRequests(page = 1): Promise<Paginated<LeaveRequest>> {
	return toPaginated(await get<RawPaginatedResponse<LeaveRequest>>(`${BASE}/me/leave/requests`, { page }))
}

export async function submitMyLeave(payload: SubmitLeavePayload): Promise<LeaveRequest> {
	return submit(`${BASE}/me/leave/requests`, payload)
}

export async function cancelMyLeave(id: number): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/me/leave/requests/${id}/cancel`)
}

/** Direct reports away or asking to be, three months at most. */
export async function myTeamLeave(from: string, to: string): Promise<TeamLeave[]> {
	return rowsOf<TeamLeave>((await get<{ data: TeamLeave[] }>(`${BASE}/me/team/leave`, { from, to })).data)
}
