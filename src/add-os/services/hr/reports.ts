/**
 * HR reports under `/api/v1/hr/reports`, every one behind hr.reports.view.
 * Each is JSON, or — with `format=csv` — a download the server writes in
 * the reader's language and audits. Money (payroll, loans) comes back only
 * to holders of hr.payroll.view.
 *
 * Routes and shapes read from ADD Core `packages/add/hr/routes/reports/admin.php`
 * and `src/Reports`.
 */

import type { ExceptionsReport, HeadcountReport, HrDashboard, LiabilitiesReport, TimesheetComplianceReport } from "@/add-os/modules/hr/types/reports"
import { downloadFile, get } from "../api"

const BASE = "/api/v1/hr/reports"

/** The workforce, its alerts and one section per enabled module, on a day (today by default). */
export async function getDashboard(asOf?: string | null): Promise<HrDashboard> {
	return (await get<{ data: HrDashboard }>(`${BASE}/dashboard`, asOf ? { as_of: asOf } : undefined)).data
}

/** Month by month from `from` to `to`, at most 36 months. */
export async function getHeadcount(from: string, to: string): Promise<HeadcountReport> {
	return (await get<{ data: HeadcountReport }>(`${BASE}/headcount`, { from, to })).data
}

export async function downloadHeadcount(from: string, to: string): Promise<void> {
	await downloadFile(`${BASE}/headcount`, { from, to, format: "csv" }, `headcount-${from}-${to}.csv`)
}

/** Exceptions per employee and type over the days, and how many are still open. */
export async function getExceptionsReport(from: string, to: string): Promise<ExceptionsReport> {
	return (await get<{ data: ExceptionsReport }>(`${BASE}/attendance-exceptions`, { from, to })).data
}

export async function downloadExceptionsReport(from: string, to: string): Promise<void> {
	await downloadFile(`${BASE}/attendance-exceptions`, { from, to, format: "csv" }, `attendance-exceptions-${from}-${to}.csv`)
}

/** Everyone employed during the week with their timesheet's status, or `missing`. */
export async function getTimesheetCompliance(weekStart: string): Promise<TimesheetComplianceReport> {
	return (await get<{ data: TimesheetComplianceReport }>(`${BASE}/timesheet-compliance`, { week_start: weekStart })).data
}

export async function downloadTimesheetCompliance(weekStart: string): Promise<void> {
	await downloadFile(`${BASE}/timesheet-compliance`, { week_start: weekStart, format: "csv" }, `timesheet-compliance-${weekStart}.csv`)
}

/** Leave days owed and, with pay, loan installments still to deduct, on a day. */
export async function getLiabilities(asOf?: string | null): Promise<LiabilitiesReport> {
	return (await get<{ data: LiabilitiesReport }>(`${BASE}/liabilities`, asOf ? { as_of: asOf } : undefined)).data
}

export async function downloadLiabilities(asOf: string): Promise<void> {
	await downloadFile(`${BASE}/liabilities`, { as_of: asOf, format: "csv" }, `liabilities-${asOf}.csv`)
}
