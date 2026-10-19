/**
 * HR payroll under `/api/v1/hr`. Reading pay, runs and slips needs
 * hr.payroll.view; components and rate tables are settings
 * (hr.settings.manage); an employee's pay needs hr.compensation.manage; each
 * step of a run has its own ability — hr.payroll.manage to open, calculate,
 * review, reconcile and adjust, hr.payroll.approve to approve,
 * hr.payroll.pay to pay, export the journal and post; loans need
 * hr.loans.manage. `hr/me/*` is the employee's own pay.
 *
 * Routes, rules and shapes read from ADD Core
 * `packages/add/hr/routes/payroll/{admin,self}.php` and `src/Payroll/Http`.
 */

import type { Paginated, RawPaginatedResponse } from "../pagination"
import type { UpdateResult } from "./core"
import type {
	AdjustmentPayload,
	Compensation,
	CompensationLine,
	CurrencyOption,
	EndOfServiceEstimate,
	EndOfServiceLiability,
	JournalRow,
	Loan,
	LoanPayload,
	LoanStatus,
	OpenPayrollRunPayload,
	PayComponent,
	PayComponentPayload,
	PayrollAdjustment,
	PayrollRun,
	PayrollRunStatus,
	PayrollVariance,
	Payslip,
	RateTable,
	RateTablePayload,
	RateVersionPayload
} from "@/add-os/modules/hr/types/payroll"
import { del, downloadFile, get, patch, post, put } from "../api"
import { rowsOf, toPaginated } from "../pagination"

const BASE = "/api/v1/hr"

// ── Currencies ──────────────────────────────────────────────────────────────

let currencies: Promise<CurrencyOption[]> | null = null

/**
 * ADD's active currencies, from the public list — HR validates every amount
 * against the same table, and an HR role may not reach the admin one. Read
 * once per page load; a failure is not kept, so the next form tries again.
 */
export function listCurrencyOptions(): Promise<CurrencyOption[]> {
	currencies ??= get<{ data: CurrencyOption[] }>("/api/v1/currencies")
		.then(response => rowsOf<CurrencyOption>(response.data))
		.catch((e: unknown) => {
			currencies = null
			throw e
		})
	return currencies
}

// ── Pay components and calculators ──────────────────────────────────────────

/** The calculator keys a component may use: the built-in ones and any the server registers. */
export async function listCalculators(): Promise<string[]> {
	return rowsOf<string>((await get<{ data: string[] }>(`${BASE}/payroll-calculators`)).data)
}

export async function listPayComponents(): Promise<PayComponent[]> {
	return rowsOf<PayComponent>((await get<{ data: PayComponent[] }>(`${BASE}/pay-components`)).data)
}

export async function createPayComponent(payload: PayComponentPayload): Promise<PayComponent> {
	return (await post<{ data: PayComponent }>(`${BASE}/pay-components`, payload)).data
}

export async function updatePayComponent(id: number, payload: Partial<PayComponentPayload>): Promise<UpdateResult> {
	return patch<UpdateResult>(`${BASE}/pay-components/${id}`, payload)
}

/** 409 once pay or payslips use it — deactivate it instead. */
export async function deletePayComponent(id: number): Promise<UpdateResult> {
	await del<void>(`${BASE}/pay-components/${id}`)
	return {}
}

// ── Rate tables ─────────────────────────────────────────────────────────────

export async function listRateTables(): Promise<RateTable[]> {
	return rowsOf<RateTable>((await get<{ data: RateTable[] }>(`${BASE}/rate-tables`)).data)
}

export async function createRateTable(payload: RateTablePayload): Promise<RateTable> {
	return (await post<{ data: RateTable }>(`${BASE}/rate-tables`, payload)).data
}

/** The code and the name; the kind is fixed once the table exists. */
export async function updateRateTable(id: number, payload: Omit<RateTablePayload, "kind">): Promise<UpdateResult> {
	return patch<UpdateResult>(`${BASE}/rate-tables/${id}`, payload)
}

/** 409 once the table has versions: they are part of the payroll history. */
export async function deleteRateTable(id: number): Promise<UpdateResult> {
	await del<void>(`${BASE}/rate-tables/${id}`)
	return {}
}

/** A new version, which may not overlap another; answers the table with its versions. */
export async function addRateVersion(tableId: number, payload: RateVersionPayload): Promise<RateTable> {
	return (await post<{ data: RateTable }>(`${BASE}/rate-tables/${tableId}/versions`, payload)).data
}

/** Ends a version on a date (no earlier than its start). */
export async function closeRateVersion(versionId: number, effectiveTo: string, note: string | null): Promise<UpdateResult> {
	return patch<UpdateResult>(`${BASE}/rate-table-versions/${versionId}`, { effective_to: effectiveTo, note })
}

// ── An employee's pay and end of service ────────────────────────────────────

export async function listCompensation(employeeId: number): Promise<Compensation[]> {
	return rowsOf<Compensation>((await get<{ data: Compensation[] }>(`${BASE}/employees/${employeeId}/compensation`)).data)
}

/**
 * Replaces the whole pay from a date: every line running then ends the day
 * before. No lines ends the pay. Recorded on the career timeline.
 */
export async function changeCompensation(employeeId: number, effectiveFrom: string, lines: CompensationLine[], reason: string | null): Promise<UpdateResult> {
	return put<UpdateResult>(`${BASE}/employees/${employeeId}/compensation`, { effective_from: effectiveFrom, reason, lines })
}

export async function endOfServiceEstimate(employeeId: number, asOf?: string): Promise<EndOfServiceEstimate> {
	return (await get<{ data: EndOfServiceEstimate }>(`${BASE}/employees/${employeeId}/end-of-service`, asOf ? { as_of: asOf } : undefined)).data
}

/** What every employee in service on the date would be owed, with totals by currency. */
export async function endOfServiceLiability(asOf?: string): Promise<EndOfServiceLiability> {
	return (await get<{ data: EndOfServiceLiability }>(`${BASE}/reports/end-of-service-liability`, asOf ? { as_of: asOf } : undefined)).data
}

// ── Payroll runs ────────────────────────────────────────────────────────────

export interface PayrollRunFilters {
	page?: number
	year?: number | null
	status?: PayrollRunStatus | null
}

export async function listPayrollRuns(filters: PayrollRunFilters = {}): Promise<Paginated<PayrollRun>> {
	const query: Record<string, unknown> = { page: filters.page ?? 1 }
	if (filters.year) query.year = filters.year
	if (filters.status) query.status = filters.status
	return toPaginated(await get<RawPaginatedResponse<PayrollRun>>(`${BASE}/payroll-runs`, query))
}

export async function openPayrollRun(payload: OpenPayrollRunPayload): Promise<PayrollRun> {
	return (await post<{ data: PayrollRun }>(`${BASE}/payroll-runs`, payload)).data
}

/** A run with its totals. */
export async function getPayrollRun(id: number): Promise<PayrollRun> {
	return (await get<{ data: PayrollRun }>(`${BASE}/payroll-runs/${id}`)).data
}

/** Throws a run away, slips and all, while it is not approved. */
export async function cancelPayrollRun(id: number): Promise<UpdateResult> {
	await del<void>(`${BASE}/payroll-runs/${id}`)
	return {}
}

/** The steps of a run, each answering the server's message. */
export type RunStep = "calculate" | "review" | "reconcile" | "approve" | "post"

export async function runStep(id: number, step: RunStep): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/payroll-runs/${id}/${step}`)
}

export async function payPayrollRun(id: number, paymentReference: string | null): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/payroll-runs/${id}/pay`, { payment_reference: paymentReference })
}

export async function listRunPayslips(id: number, page = 1): Promise<Paginated<Payslip>> {
	return toPaginated(await get<RawPaginatedResponse<Payslip>>(`${BASE}/payroll-runs/${id}/payslips`, { page }))
}

/** Each slip against the last approved regular run before it. */
export async function payrollVariance(id: number): Promise<PayrollVariance> {
	return (await get<{ data: PayrollVariance }>(`${BASE}/payroll-runs/${id}/variance`)).data
}

export async function listAdjustments(id: number): Promise<PayrollAdjustment[]> {
	return rowsOf<PayrollAdjustment>((await get<{ data: PayrollAdjustment[] }>(`${BASE}/payroll-runs/${id}/adjustments`)).data)
}

/** Sends a calculated run back to open: it needs calculating again. */
export async function addAdjustment(id: number, payload: AdjustmentPayload): Promise<{ id: number }> {
	return (await post<{ data: { id: number } }>(`${BASE}/payroll-runs/${id}/adjustments`, payload)).data
}

export async function removeAdjustment(adjustmentId: number): Promise<UpdateResult> {
	await del<void>(`${BASE}/payroll-adjustments/${adjustmentId}`)
	return {}
}

/** An approved run's journal lines. */
export async function payrollJournal(id: number): Promise<JournalRow[]> {
	return rowsOf<JournalRow>((await get<{ data: JournalRow[] }>(`${BASE}/payroll-runs/${id}/journal`)).data)
}

/** The same journal as the server's CSV; every export is audited. */
export async function downloadPayrollJournal(run: Pick<PayrollRun, "id" | "year" | "month">): Promise<void> {
	const period = `${run.year}-${String(run.month).padStart(2, "0")}`
	await downloadFile(`${BASE}/payroll-runs/${run.id}/journal`, { format: "csv" }, `payroll-journal-${period}-${run.id}.csv`)
}

/** A slip with its lines, as HR reads it (employer cost included). */
export async function getPayslip(id: number): Promise<Payslip> {
	return (await get<{ data: Payslip }>(`${BASE}/payslips/${id}`)).data
}

// ── Loans ───────────────────────────────────────────────────────────────────

export interface LoanFilters {
	page?: number
	status?: LoanStatus | null
	employee_id?: number | null
}

export async function listLoans(filters: LoanFilters = {}): Promise<Paginated<Loan>> {
	const query: Record<string, unknown> = { page: filters.page ?? 1 }
	if (filters.status) query.status = filters.status
	if (filters.employee_id) query.employee_id = filters.employee_id
	return toPaginated(await get<RawPaginatedResponse<Loan>>(`${BASE}/loans`, query))
}

export async function getLoan(id: number): Promise<Loan> {
	return (await get<{ data: Loan }>(`${BASE}/loans/${id}`)).data
}

/** A loan filed for an employee; it goes through the approval flow like their own request. */
export async function createLoan(employeeId: number, payload: LoanPayload): Promise<Loan> {
	return (await post<{ data: Loan }>(`${BASE}/employees/${employeeId}/loans`, payload)).data
}

/** What is still due is settled outside payroll (cash, or a final settlement). */
export async function settleLoan(id: number, note: string): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/loans/${id}/settle`, { note })
}

// ── My pay (hr/me) ──────────────────────────────────────────────────────────

/** Issued slips only: a slip is published when its run is approved. */
export async function listMyPayslips(page = 1): Promise<Paginated<Payslip>> {
	return toPaginated(await get<RawPaginatedResponse<Payslip>>(`${BASE}/me/payslips`, { page }))
}

export async function getMyPayslip(id: number): Promise<Payslip> {
	return (await get<{ data: Payslip }>(`${BASE}/me/payslips/${id}`)).data
}

export async function listMyLoans(): Promise<Loan[]> {
	return rowsOf<Loan>((await get<{ data: Loan[] }>(`${BASE}/me/loans`)).data)
}

export async function requestMyLoan(payload: LoanPayload): Promise<Loan> {
	return (await post<{ data: Loan }>(`${BASE}/me/loans`, payload)).data
}

/** While it is pending; withdraws its approval request. */
export async function cancelMyLoan(id: number): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/me/loans/${id}/cancel`)
}
