/**
 * HR approvals (`add/hr` Approvals module). Shapes read from ADD Core
 * `packages/add/hr/src/Approvals/Http/Resources` and its Form Requests.
 */
import type { Translatable } from "@/add-os/modules/hr/types/hr"

export type ApprovalStatus = "pending" | "approved" | "rejected" | "cancelled"
export type StepStatus = "waiting" | "pending" | "approved" | "rejected" | "cancelled"
export type ApproverType = "direct_manager" | "unit_head" | "ability" | "employee"
export type DecisionSource = "approver" | "delegate" | "override" | "timeout"
export type TimeoutAction = "escalate" | "approve" | "reject"

export const APPROVAL_STATUSES: readonly ApprovalStatus[] = ["pending", "approved", "rejected", "cancelled"]
export const APPROVER_TYPES: readonly ApproverType[] = ["direct_manager", "unit_head", "ability", "employee"]
export const TIMEOUT_ACTIONS: readonly TimeoutAction[] = ["escalate", "approve", "reject"]

/**
 * The request types ADD Core registers (HrServiceProvider): one per module
 * that submits something for approval. `GET approval-types` is the live list;
 * this one only names the ones the dashboard has labels and a summary for.
 */
export const KNOWN_REQUEST_TYPES = ["leave", "attendance_entry", "overtime", "timesheet", "loan", "requisition", "offer", "learning"] as const

/** The `hr.*` abilities (Add\Hr\Authorization\Abilities): what an "ability" step can ask the approver to hold. */
export const HR_ABILITIES = [
	"hr.org.view",
	"hr.org.manage",
	"hr.employees.view",
	"hr.employees.create",
	"hr.employees.update",
	"hr.employees.view_sensitive",
	"hr.lifecycle.manage",
	"hr.documents.view",
	"hr.documents.manage",
	"hr.checklists.manage",
	"hr.alerts.view",
	"hr.settings.manage",
	"hr.approvals.manage",
	"hr.leave.view",
	"hr.leave.manage",
	"hr.attendance.view",
	"hr.attendance.correct",
	"hr.attendance.lock",
	"hr.attendance.cards",
	"hr.roster.manage",
	"hr.timesheets.view",
	"hr.timesheets.manage",
	"hr.payroll.view",
	"hr.payroll.manage",
	"hr.payroll.approve",
	"hr.payroll.pay",
	"hr.compensation.manage",
	"hr.loans.manage",
	"hr.benefits.view",
	"hr.benefits.manage",
	"hr.recruitment.view",
	"hr.recruitment.manage",
	"hr.performance.view",
	"hr.performance.manage",
	"hr.training.view",
	"hr.training.manage",
	"hr.reports.view"
] as const

/** One step of a flow, as stored (StoreApprovalFlowRequest::steps()): keys absent when they do not apply. */
export interface FlowStep {
	approver: ApproverType
	ability?: string
	employee_id?: number
	timeout_hours?: number
	on_timeout?: TimeoutAction
}

/** `GET approval-flows`. Copied into each request on submission: editing one affects only later requests. */
export interface ApprovalFlow {
	id: number
	request_type: string
	name: Translatable | null
	steps: FlowStep[]
	is_active: boolean
}

export interface ApprovalFlowPayload {
	request_type?: string
	name: Translatable | null
	steps: FlowStep[]
	is_active: boolean
}

export interface ApprovalStep {
	sort: number
	approver_type: ApproverType
	approver_employee: { id: number; name: Translatable } | null
	approver_ability: string | null
	status: StepStatus
	decided_via: DecisionSource | null
	/** A user id. */
	decided_by: number | null
	comment: string | null
	due_at: string | null
	escalated_at: string | null
	decided_at: string | null
}

/** `GET approval-requests` and `GET me/approvals`. `subject` is the request type's own summary. */
export interface ApprovalRequest {
	id: number
	request_type: string
	status: ApprovalStatus
	employee: { id: number; employee_number: string; name: Translatable }
	submitted_by: number | null
	current_step: number
	subject: Record<string, unknown> | null
	steps: ApprovalStep[]
	created_at: string | null
	decided_at: string | null
}

export interface Delegation {
	id: number
	delegate: { id: number; name: Translatable }
	starts_on: string
	ends_on: string
	/** Null hands over every request type. */
	request_type: string | null
}

export interface DelegationPayload {
	delegate_employee_id: number
	starts_on: string
	ends_on: string
	request_type: string | null
}
