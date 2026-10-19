/**
 * HR timesheets and cost under `/api/v1/hr`. Reads need
 * hr.timesheets.view; cost centers are settings (hr.settings.manage); an
 * employee's cost split needs hr.timesheets.manage. Timesheets are decided
 * through the approval engine. `hr/me/timesheets/{week}` addresses a week by
 * its first day.
 *
 * Routes, rules and shapes read from ADD Core
 * `packages/add/hr/routes/timesheets/{admin,self}.php` and
 * `src/Timesheets/Http`.
 */

import type { Paginated, RawPaginatedResponse } from "../pagination"
import type { UpdateResult } from "./core"
import type {
	CostAllocation,
	CostAllocationLine,
	CostCenter,
	CostCenterPayload,
	Reconciliation,
	TimeByCostCenterRow,
	Timesheet,
	TimesheetCompliance,
	TimesheetEntry,
	TimesheetStatus
} from "@/add-os/modules/hr/types/timesheets"
import { del, downloadFile, get, patch, post, put } from "../api"
import { rowsOf, toPaginated } from "../pagination"

const BASE = "/api/v1/hr"

// ── Cost centers ────────────────────────────────────────────────────────────

export async function listCostCenters(): Promise<CostCenter[]> {
	return rowsOf<CostCenter>((await get<{ data: CostCenter[] }>(`${BASE}/cost-centers`)).data)
}

export async function createCostCenter(payload: CostCenterPayload): Promise<CostCenter> {
	return (await post<{ data: CostCenter }>(`${BASE}/cost-centers`, payload)).data
}

export async function updateCostCenter(id: number, payload: Partial<CostCenterPayload>): Promise<UpdateResult> {
	return patch<UpdateResult>(`${BASE}/cost-centers/${id}`, payload)
}

/** 409 once hours or splits are charged to it — deactivate it instead. */
export async function deleteCostCenter(id: number): Promise<UpdateResult> {
	await del<void>(`${BASE}/cost-centers/${id}`)
	return {}
}

// ── An employee's cost split ────────────────────────────────────────────────

export async function listCostAllocations(employeeId: number): Promise<CostAllocation[]> {
	return rowsOf<CostAllocation>((await get<{ data: CostAllocation[] }>(`${BASE}/employees/${employeeId}/cost-allocations`)).data)
}

/** A new split from a date, adding up to 100%; the one before it ends the day before. */
export async function replaceCostAllocations(employeeId: number, effectiveFrom: string, lines: CostAllocationLine[]): Promise<UpdateResult> {
	return put<UpdateResult>(`${BASE}/employees/${employeeId}/cost-allocations`, { effective_from: effectiveFrom, lines })
}

// ── Timesheets ──────────────────────────────────────────────────────────────

export interface TimesheetFilters {
	page?: number
	week_start?: string | null
	status?: TimesheetStatus | null
	employee_id?: number | null
}

export async function listTimesheets(filters: TimesheetFilters = {}): Promise<Paginated<Timesheet>> {
	const query: Record<string, unknown> = { page: filters.page ?? 1 }
	for (const key of ["week_start", "status", "employee_id"] as const) {
		if (filters[key]) query[key] = filters[key]
	}
	return toPaginated(await get<RawPaginatedResponse<Timesheet>>(`${BASE}/timesheets`, query))
}

/** A timesheet with its lines and how it compares with attendance. */
export async function getTimesheet(id: number): Promise<{ timesheet: Timesheet; reconciliation: Reconciliation }> {
	const response = await get<{ data: Timesheet; reconciliation: Reconciliation }>(`${BASE}/timesheets/${id}`)
	return { timesheet: response.data, reconciliation: response.reconciliation }
}

/** Who was employed in the week (optionally in a unit) with no timesheet submitted or approved for it. */
export async function timesheetCompliance(weekStart: string, orgUnitId?: number | null): Promise<TimesheetCompliance> {
	const query: Record<string, unknown> = { week_start: weekStart }
	if (orgUnitId) query.org_unit_id = orgUnitId
	return (await get<{ data: TimesheetCompliance }>(`${BASE}/timesheets/compliance`, query)).data
}

export interface TimeReportFilters {
	from: string
	to: string
	cost_center_id?: number | null
}

function reportQuery(filters: TimeReportFilters): Record<string, unknown> {
	const query: Record<string, unknown> = { from: filters.from, to: filters.to }
	if (filters.cost_center_id) query.cost_center_id = filters.cost_center_id
	return query
}

/** Approved hours by cost center and employee, a year at most. */
export async function timeByCostCenter(filters: TimeReportFilters): Promise<TimeByCostCenterRow[]> {
	return rowsOf<TimeByCostCenterRow>((await get<{ data: TimeByCostCenterRow[] }>(`${BASE}/reports/time-by-cost-center`, reportQuery(filters))).data)
}

/** The same report as a CSV file, named by the server; every export is audited. */
export async function downloadTimeByCostCenter(filters: TimeReportFilters): Promise<void> {
	await downloadFile(`${BASE}/reports/time-by-cost-center`, { ...reportQuery(filters), format: "csv" }, `time-by-cost-center-${filters.from}-${filters.to}.csv`)
}

// ── My timesheets (hr/me) ───────────────────────────────────────────────────

/** The active cost centers an employee may log hours against. */
export async function myCostCenters(): Promise<CostCenter[]> {
	return rowsOf<CostCenter>((await get<{ data: CostCenter[] }>(`${BASE}/me/cost-centers`)).data)
}

export async function listMyTimesheets(page = 1): Promise<Paginated<Timesheet>> {
	return toPaginated(await get<RawPaginatedResponse<Timesheet>>(`${BASE}/me/timesheets`, { page }))
}

export async function getMyTimesheet(weekStart: string): Promise<{ timesheet: Timesheet; reconciliation: Reconciliation }> {
	const response = await get<{ data: Timesheet; reconciliation: Reconciliation }>(`${BASE}/me/timesheets/${weekStart}`)
	return { timesheet: response.data, reconciliation: response.reconciliation }
}

/** Replaces the week's lines; only a draft (or a rejected week) can change. */
export async function saveMyTimesheet(weekStart: string, entries: Omit<TimesheetEntry, "id">[]): Promise<UpdateResult> {
	return put<UpdateResult>(`${BASE}/me/timesheets/${weekStart}`, { entries })
}

export async function submitMyTimesheet(weekStart: string): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/me/timesheets/${weekStart}/submit`)
}

/** Back to draft while it waits for approval. */
export async function recallMyTimesheet(weekStart: string): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/me/timesheets/${weekStart}/recall`)
}
