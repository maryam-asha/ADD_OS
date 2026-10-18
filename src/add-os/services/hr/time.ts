/**
 * HR time and attendance under `/api/v1/hr`. Settings (shifts, work
 * patterns, attendance policies) and every list read with
 * hr.attendance.view and settings write with hr.settings.manage; the roster
 * needs hr.roster.manage, staff cards hr.attendance.cards, punches,
 * resolutions and reprocessing hr.attendance.correct, the monthly lock
 * hr.attendance.lock. `hr/me` serves the employee's own schedule, days,
 * entries and overtime, and their direct reports' day.
 *
 * Routes, rules and shapes read from ADD Core
 * `packages/add/hr/routes/time/{admin,self}.php` and `src/Time/Http`.
 */

import type { Paginated, RawPaginatedResponse } from "../pagination"
import type { UpdateResult } from "./core"
import type {
	AttendanceCardStatus,
	AttendanceDay,
	AttendanceEntry,
	AttendanceException,
	AttendancePolicy,
	AttendancePolicyPayload,
	AttendanceRange,
	ExceptionResolution,
	MyScheduleDay,
	OvertimeRequest,
	Punch,
	RosterChange,
	RosterRow,
	ShiftTemplate,
	ShiftTemplatePayload,
	TeamAttendance,
	TimePeriod,
	WorkPattern,
	WorkPatternPayload
} from "@/add-os/modules/hr/types/time"
import { del, get, patch, post, put } from "../api"
import { rowsOf, toPaginated } from "../pagination"

const BASE = "/api/v1/hr"

/** Only the filters that are set. */
function rangeQuery(range: AttendanceRange): Record<string, unknown> {
	const query: Record<string, unknown> = { from: range.from, to: range.to }
	for (const key of ["employee_id", "org_unit_id", "status", "type", "page"] as const) {
		if (range[key]) query[key] = range[key]
	}
	return query
}

// ── Settings ────────────────────────────────────────────────────────────────

export async function listShiftTemplates(): Promise<ShiftTemplate[]> {
	return rowsOf<ShiftTemplate>((await get<{ data: ShiftTemplate[] }>(`${BASE}/shift-templates`)).data)
}

export async function createShiftTemplate(payload: ShiftTemplatePayload): Promise<ShiftTemplate> {
	return (await post<{ data: ShiftTemplate }>(`${BASE}/shift-templates`, payload)).data
}

export async function updateShiftTemplate(id: number, payload: Partial<ShiftTemplatePayload>): Promise<UpdateResult> {
	return patch<UpdateResult>(`${BASE}/shift-templates/${id}`, payload)
}

/** 409 once the shift is rostered, worked or in a work pattern. */
export async function deleteShiftTemplate(id: number): Promise<UpdateResult> {
	await del<void>(`${BASE}/shift-templates/${id}`)
	return {}
}

export async function listWorkPatterns(): Promise<WorkPattern[]> {
	return rowsOf<WorkPattern>((await get<{ data: WorkPattern[] }>(`${BASE}/work-patterns`)).data)
}

export async function createWorkPattern(payload: WorkPatternPayload): Promise<WorkPattern> {
	return (await post<{ data: WorkPattern }>(`${BASE}/work-patterns`, payload)).data
}

export async function updateWorkPattern(id: number, payload: Partial<WorkPatternPayload>): Promise<UpdateResult> {
	return patch<UpdateResult>(`${BASE}/work-patterns/${id}`, payload)
}

/** 409 while an assignment uses it. */
export async function deleteWorkPattern(id: number): Promise<UpdateResult> {
	await del<void>(`${BASE}/work-patterns/${id}`)
	return {}
}

export async function listAttendancePolicies(): Promise<AttendancePolicy[]> {
	return rowsOf<AttendancePolicy>((await get<{ data: AttendancePolicy[] }>(`${BASE}/attendance-policies`)).data)
}

export async function createAttendancePolicy(payload: AttendancePolicyPayload): Promise<AttendancePolicy> {
	return (await post<{ data: AttendancePolicy }>(`${BASE}/attendance-policies`, payload)).data
}

export async function updateAttendancePolicy(id: number, payload: Partial<AttendancePolicyPayload>): Promise<UpdateResult> {
	return patch<UpdateResult>(`${BASE}/attendance-policies/${id}`, payload)
}

export async function deleteAttendancePolicy(id: number): Promise<UpdateResult> {
	await del<void>(`${BASE}/attendance-policies/${id}`)
	return {}
}

// ── Roster ──────────────────────────────────────────────────────────────────

/** Each employee's plan per day (200 employees at most), from the roster or their pattern. */
export async function getRoster(range: AttendanceRange): Promise<RosterRow[]> {
	return rowsOf<RosterRow>((await get<{ data: RosterRow[] }>(`${BASE}/roster`, rangeQuery(range))).data)
}

export async function saveRoster(entries: RosterChange[]): Promise<UpdateResult> {
	return put<UpdateResult>(`${BASE}/roster`, { entries })
}

/** Copies the week starting `from` onto the week starting `to`, for a unit or a list of employees. */
export async function copyRosterWeek(payload: { from: string; to: string; org_unit_id?: number | null; employee_ids?: number[] }): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/roster/copy-week`, payload)
}

// ── Days, exceptions, entries, overtime ─────────────────────────────────────

export async function listAttendanceDays(range: AttendanceRange): Promise<Paginated<AttendanceDay>> {
	return toPaginated(await get<RawPaginatedResponse<AttendanceDay>>(`${BASE}/attendance-days`, rangeQuery(range)))
}

export async function listAttendanceExceptions(range: AttendanceRange): Promise<Paginated<AttendanceException>> {
	return toPaginated(await get<RawPaginatedResponse<AttendanceException>>(`${BASE}/attendance-exceptions`, rangeQuery(range)))
}

export async function resolveAttendanceException(id: number, resolution: ExceptionResolution, note: string | null): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/attendance-exceptions/${id}/resolve`, { resolution, note })
}

export async function listAttendanceEntries(range: AttendanceRange): Promise<Paginated<AttendanceEntry>> {
	return toPaginated(await get<RawPaginatedResponse<AttendanceEntry>>(`${BASE}/attendance-entries`, rangeQuery(range)))
}

export async function listOvertimeRequests(range: AttendanceRange): Promise<Paginated<OvertimeRequest>> {
	return toPaginated(await get<RawPaginatedResponse<OvertimeRequest>>(`${BASE}/overtime-requests`, rangeQuery(range)))
}

/** Rebuilds the days of a range (two months at most) from punches and plans. */
export async function reprocessAttendance(payload: { from: string; to: string; employee_id?: number | null }): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/attendance/reprocess`, payload)
}

// ── An employee's punches and card ──────────────────────────────────────────

export async function listPunches(employeeId: number, from: string, to: string): Promise<Punch[]> {
	return rowsOf<Punch>((await get<{ data: Punch[] }>(`${BASE}/employees/${employeeId}/attendance-punches`, { from, to })).data)
}

/** `punched_at` is the organisation's wall clock, `yyyy-MM-dd HH:mm`. Audited with its reason. */
export async function addManualPunch(employeeId: number, punchedAt: string, reason: string): Promise<Punch> {
	return (await post<{ data: Punch }>(`${BASE}/employees/${employeeId}/attendance-punches`, { punched_at: punchedAt, reason })).data
}

export async function getAttendanceCard(employeeId: number): Promise<AttendanceCardStatus> {
	return (await get<{ data: AttendanceCardStatus }>(`${BASE}/employees/${employeeId}/attendance-card`)).data
}

/** Issues a new card, revoking any current one. The value comes back only now — print it. */
export async function issueAttendanceCard(employeeId: number): Promise<string> {
	return (await post<{ data: { qr_value: string } }>(`${BASE}/employees/${employeeId}/attendance-card`)).data.qr_value
}

export async function revokeAttendanceCard(employeeId: number): Promise<void> {
	await del<void>(`${BASE}/employees/${employeeId}/attendance-card`)
}

// ── Monthly lock ────────────────────────────────────────────────────────────

export async function listTimePeriods(): Promise<TimePeriod[]> {
	return rowsOf<TimePeriod>((await get<{ data: TimePeriod[] }>(`${BASE}/time-periods`)).data)
}

/** Refused while the month has not ended, or has open exceptions or pending requests. */
export async function lockTimePeriod(year: number, month: number): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/time-periods/${year}/${month}/lock`)
}

export async function unlockTimePeriod(year: number, month: number): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/time-periods/${year}/${month}/unlock`)
}

// ── My attendance (hr/me) ───────────────────────────────────────────────────

export async function mySchedule(from: string, to: string): Promise<MyScheduleDay[]> {
	return rowsOf<MyScheduleDay>((await get<{ data: MyScheduleDay[] }>(`${BASE}/me/schedule`, { from, to })).data)
}

export async function myAttendanceDays(from: string, to: string): Promise<AttendanceDay[]> {
	return rowsOf<AttendanceDay>((await get<{ data: AttendanceDay[] }>(`${BASE}/me/attendance`, { from, to })).data)
}

export async function myAttendanceEntries(page = 1): Promise<Paginated<AttendanceEntry>> {
	return toPaginated(await get<RawPaginatedResponse<AttendanceEntry>>(`${BASE}/me/attendance/entries`, { page }))
}

/** A missed arrival and/or departure (`HH:mm`) for today or a past day; it goes for approval. */
export async function submitAttendanceEntry(payload: { work_date: string; check_in: string | null; check_out: string | null; note: string | null }): Promise<AttendanceEntry> {
	return (await post<{ data: AttendanceEntry }>(`${BASE}/me/attendance/entries`, payload)).data
}

export async function cancelAttendanceEntry(id: number): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/me/attendance/entries/${id}/cancel`)
}

export async function myOvertime(page = 1): Promise<Paginated<OvertimeRequest>> {
	return toPaginated(await get<RawPaginatedResponse<OvertimeRequest>>(`${BASE}/me/overtime`, { page }))
}

export async function submitOvertime(payload: { work_date: string; minutes: number; reason: string }): Promise<OvertimeRequest> {
	return (await post<{ data: OvertimeRequest }>(`${BASE}/me/overtime`, payload)).data
}

export async function cancelOvertime(id: number): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/me/overtime/${id}/cancel`)
}

/** Today by default. */
export async function myTeamAttendance(date?: string | null): Promise<TeamAttendance[]> {
	return rowsOf<TeamAttendance>((await get<{ data: TeamAttendance[] }>(`${BASE}/me/team/attendance`, date ? { date } : undefined)).data)
}
