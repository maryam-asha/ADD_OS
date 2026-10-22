/**
 * HR timesheets and cost (`add/hr` Timesheets module). Shapes read from
 * ADD Core `packages/add/hr/src/Timesheets/Http/Resources`, its Form
 * Requests, and the answers built inline by TimesheetController,
 * MyTimesheetController, TimeReportController and TimesheetReconciliation.
 * Hours and percents are decimal strings.
 */
import type { Translatable } from "@/add-os/modules/hr/types/hr"

export type TimesheetStatus = "draft" | "submitted" | "approved" | "rejected"
export const TIMESHEET_STATUSES: readonly TimesheetStatus[] = ["draft", "submitted", "approved", "rejected"]

/**
 * The ISO weekday a timesheet week starts on, and the step hours are
 * entered in. They mirror ADD Core `config/hr.php` `timesheets.week_starts_on`
 * and `timesheets.increment_hours`, which no endpoint exposes: change them
 * together with the server's, or every week is refused as "not the first
 * day of a timesheet week".
 *
 * Sunday (7), not the package's Monday default: ADD works Sunday to Thursday,
 * and ADD Core's own `config/hr.php` overrides the package with 7. This was 1
 * until 2026-10-21, and every week was refused on a real server (the live HR
 * run that day); `timesheet-week-matches-core.spec.ts` now compares both
 * values with the ADD Core checkout beside this one.
 */
export const TIMESHEET_WEEK_STARTS_ON = 7
export const TIMESHEET_INCREMENT_HOURS = 0.5

export interface CostCenter {
	id: number
	code: string
	name: Translatable
	costable_type: string | null
	costable_id: number | null
	is_active: boolean
}

export interface CostCenterPayload {
	code: string
	name: Translatable
	is_active: boolean
}

export interface CostAllocation {
	id: number
	cost_center: { id: number; code: string; name: Translatable }
	percent: string
	effective_from: string
	effective_to: string | null
}

export interface CostAllocationLine {
	cost_center_id: number
	percent: number
}

export interface TimesheetEntry {
	id?: number
	cost_center_id: number
	work_date: string
	hours: string | number
	note: string | null
}

export interface Timesheet {
	/** Null for a week not started yet: `GET me/timesheets/{week}` answers an empty draft without creating it. */
	id: number | null
	employee?: { id: number; employee_number: string; name: Translatable }
	week_start: string
	week_end: string
	status: TimesheetStatus
	total_hours: string
	approval_request_id?: number | null
	submitted_at?: string | null
	entries?: TimesheetEntry[]
}

/** Logged against attended hours, day by day (TimesheetReconciliation::for()). */
export interface Reconciliation {
	days: { date: string; timesheet_hours: string; attendance_hours: string; difference_hours: string }[]
	timesheet_hours: number
	attendance_hours: number
	difference_hours: number
}

export interface TimesheetCompliance {
	week_start: string
	missing: { id: number; employee_number: string; name: Translatable; status: TimesheetStatus | null }[]
}

/** One row of `GET reports/time-by-cost-center`: approved hours, split by each employee's cost allocation. */
export interface TimeByCostCenterRow {
	cost_center: { id: number; code: string | null; name: Translatable | null }
	employee: { id: number; employee_number: string | null; name: Translatable | null }
	hours: string
}
