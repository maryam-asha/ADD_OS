/**
 * HR benefits under `/api/v1/hr`. Reading needs hr.benefits.view, changing
 * benefits, assignments and grants hr.benefits.manage; the employee cost
 * report reads pay, so it needs hr.payroll.view. `hr/me/benefits` is the
 * employee's own.
 *
 * Routes, rules and shapes read from ADD Core
 * `packages/add/hr/routes/benefits/{admin,self}.php` and `src/Benefits/Http`.
 */

import type { Paginated, RawPaginatedResponse } from "../pagination"
import type { UpdateResult } from "./core"
import type {
	AssignmentPayload,
	Benefit,
	BenefitAssignment,
	BenefitGrant,
	BenefitGrantStatus,
	BenefitPayload,
	EmployeeBenefits,
	EmployeeCostReport,
	GrantRunResult,
	MyBenefits
} from "@/add-os/modules/hr/types/benefits"
import { del, get, patch, post } from "../api"
import { rowsOf, toPaginated } from "../pagination"

const BASE = "/api/v1/hr"

// ── Benefits ────────────────────────────────────────────────────────────────

/** Every benefit, with how many assignments it has. */
export async function listBenefits(): Promise<Benefit[]> {
	return rowsOf<Benefit>((await get<{ data: Benefit[] }>(`${BASE}/benefits`)).data)
}

export async function getBenefit(id: number): Promise<Benefit> {
	return (await get<{ data: Benefit }>(`${BASE}/benefits/${id}`)).data
}

export async function createBenefit(payload: BenefitPayload): Promise<Benefit> {
	return (await post<{ data: Benefit }>(`${BASE}/benefits`, payload)).data
}

/** The code, kind, frequency, currency, unit and pay component are fixed once it exists. */
export async function updateBenefit(id: number, payload: Partial<BenefitPayload>): Promise<UpdateResult> {
	return patch<UpdateResult>(`${BASE}/benefits/${id}`, payload)
}

/** 409 once it has been granted — deactivate it instead. */
export async function deleteBenefit(id: number): Promise<UpdateResult> {
	await del<void>(`${BASE}/benefits/${id}`)
	return {}
}

// ── Assignments ─────────────────────────────────────────────────────────────

export async function listAssignments(benefitId: number): Promise<BenefitAssignment[]> {
	return rowsOf<BenefitAssignment>((await get<{ data: BenefitAssignment[] }>(`${BASE}/benefits/${benefitId}/assignments`)).data)
}

/** To one employee, a grade or a unit (exactly one); refused when it overlaps the same target's. */
export async function assignBenefit(benefitId: number, payload: AssignmentPayload): Promise<BenefitAssignment> {
	return (await post<{ data: BenefitAssignment }>(`${BASE}/benefits/${benefitId}/assignments`, payload)).data
}

/** Ends it earlier, never later: a new assignment extends it. */
export async function endAssignment(id: number, effectiveTo: string): Promise<UpdateResult> {
	return patch<UpdateResult>(`${BASE}/benefit-assignments/${id}`, { effective_to: effectiveTo })
}

/** 409 once grants were made under it — end it instead. */
export async function deleteAssignment(id: number): Promise<UpdateResult> {
	await del<void>(`${BASE}/benefit-assignments/${id}`)
	return {}
}

/** What an employee holds on a day (default today), where each comes from, and their latest grants. */
export async function employeeBenefits(employeeId: number, asOf?: string): Promise<EmployeeBenefits> {
	return (await get<{ data: EmployeeBenefits }>(`${BASE}/employees/${employeeId}/benefits`, asOf ? { as_of: asOf } : undefined)).data
}

// ── Grants ──────────────────────────────────────────────────────────────────

export interface GrantFilters {
	page?: number
	benefit_id?: number | null
	employee_id?: number | null
	status?: BenefitGrantStatus | null
	/** `yyyy-MM`: grants made in that month. */
	month?: string | null
}

export async function listGrants(filters: GrantFilters = {}): Promise<Paginated<BenefitGrant>> {
	const query: Record<string, unknown> = { page: filters.page ?? 1 }
	for (const key of ["benefit_id", "employee_id", "status", "month"] as const) {
		if (filters[key]) query[key] = filters[key]
	}
	return toPaginated(await get<RawPaginatedResponse<BenefitGrant>>(`${BASE}/benefit-grants`, query))
}

/** Grants a month now (this month when none) rather than waiting for the daily job; safe to repeat. */
export async function runGrants(month?: string | null): Promise<GrantRunResult> {
	return (await post<{ data: GrantRunResult }>(`${BASE}/benefit-grants/run`, month ? { month } : {})).data
}

/** A failed grant, or an in-kind one left undelivered, tried again. */
export async function retryGrant(id: number): Promise<BenefitGrant> {
	return (await post<{ data: BenefitGrant }>(`${BASE}/benefit-grants/${id}/retry`)).data
}

/** A grant not yet delivered (pending or failed) called off. */
export async function cancelGrant(id: number): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/benefit-grants/${id}/cancel`)
}

/** Each employee's full cost for a month: approved payroll plus benefits, by currency. */
export async function employeeCost(month: string): Promise<EmployeeCostReport> {
	return (await get<{ data: EmployeeCostReport }>(`${BASE}/reports/employee-cost`, { month })).data
}

// ── My benefits ─────────────────────────────────────────────────────────────

export async function myBenefits(): Promise<MyBenefits> {
	return (await get<{ data: MyBenefits }>(`${BASE}/me/benefits`)).data
}
