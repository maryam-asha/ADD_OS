/**
 * HR reports (`add/hr` Reports module). Shapes read from ADD Core
 * `packages/add/hr/src/Reports` — ReportController and the Dashboard,
 * HeadcountReport and OperationsReports services, which build plain JSON
 * rather than Resources. A dashboard section is present only while its
 * module is enabled; payroll and loans only for hr.payroll.view.
 */
import type { AlertType, EmployeeStatus, PersonRef, Translatable } from "@/add-os/modules/hr/types/hr"
import type { PayrollRunStatus } from "@/add-os/modules/hr/types/payroll"
import type { CycleStatus, ReviewStatus } from "@/add-os/modules/hr/types/performance"
import type { ExceptionType } from "@/add-os/modules/hr/types/time"
import type { TimesheetStatus } from "@/add-os/modules/hr/types/timesheets"

export interface HrDashboard {
	as_of: string
	headcount: {
		employed: number
		by_status: Partial<Record<EmployeeStatus, number>>
		hires_this_month: number
		leavers_this_month: number
	}
	alerts: { total: number; by_type: Partial<Record<AlertType, number>> }
	approvals?: { pending: number; by_type: Record<string, number> }
	leave?: { pending_requests: number; on_leave_today: number }
	attendance?: { open_exceptions: number }
	timesheets?: { awaiting_approval: number }
	recruitment?: {
		open_requisitions: number
		open_openings: number
		/** Open and offer stages in their order, by stage code. */
		applications_by_stage: Record<string, number>
	}
	performance?: {
		/** Launched cycles not yet closed. */
		cycles: { id: number; name: Translatable; status: CycleStatus; reviews_by_status: Partial<Record<ReviewStatus, number>> }[]
	}
	training?: {
		/** Scheduled to start within 30 days. */
		upcoming_sessions: number
		/** Expiring within the alert horizon (hr.alerts.certification_days). */
		certifications_expiring: number
	}
	payroll?: {
		latest_run: { id: number; year: number; month: number; status: PayrollRunStatus; currency: string; employees: number; net_total: string } | null
	}
}

export interface HeadcountMonth {
	/** `yyyy-MM`. */
	month: string
	opening: number
	hires: number
	leavers: number
	closing: number
	/** Leavers over the mean headcount, as a decimal string. */
	turnover_percent: string
}

export interface HeadcountReport {
	months: HeadcountMonth[]
	/** Where people work at the end of the range. */
	by_unit: { org_unit: { id: number; name: Translatable | null }; headcount: number }[]
}

export interface ExceptionsReport {
	totals: { type: ExceptionType; total: number; open: number }[]
	rows: { employee: PersonRef | null; type: ExceptionType; total: number; open: number }[]
}

/** A timesheet's status for the week, or none at all. */
export type ComplianceStatus = TimesheetStatus | "missing"

export interface TimesheetComplianceReport {
	week_start: string
	summary: Partial<Record<ComplianceStatus, number>>
	rows: { employee: PersonRef; status: ComplianceStatus; total_hours: string | null }[]
}

export interface LiabilitiesReport {
	as_of: string
	/** Leave days still owed, per employee and type that tracks a balance. */
	leave: { employee: PersonRef; leave_type: { id: number; code: string; name: Translatable }; days: number }[]
	/** Loan installments still to deduct; null without hr.payroll.view or without payroll. */
	loans: { employee: PersonRef | null; currency: string; outstanding: string; installments: number }[] | null
}
