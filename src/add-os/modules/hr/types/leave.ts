/**
 * HR leave (`add/hr` Leave module). Shapes read from ADD Core
 * `packages/add/hr/src/Leave/Http/Resources`, its Form Requests, and
 * LeaveService::balances() / MyLeaveController::quote() for the two that are
 * built inline. Amounts are decimal strings (PlainDecimal / PlainNumber):
 * shown through formatNumber, never computed on.
 */
import type { ContractType, Translatable } from "@/add-os/modules/hr/types/hr"

export type LeaveUnit = "day" | "hour"
export type HalfDay = "first_half" | "second_half"
export type LeaveRequestStatus = "pending" | "approved" | "rejected" | "cancelled"
export type AccrualMethod = "monthly" | "annual_grant" | "none"
export type LedgerKind = "opening" | "accrual" | "usage" | "reversal" | "adjustment" | "expiry" | "encashment"
/** The movements HR may record by hand (AdjustLeaveBalanceRequest). */
export type ManualLedgerKind = "opening" | "adjustment" | "encashment"

export const LEAVE_UNITS: readonly LeaveUnit[] = ["day", "hour"]
export const HALF_DAYS: readonly HalfDay[] = ["first_half", "second_half"]
export const LEAVE_REQUEST_STATUSES: readonly LeaveRequestStatus[] = ["pending", "approved", "rejected", "cancelled"]
export const ACCRUAL_METHODS: readonly AccrualMethod[] = ["monthly", "annual_grant", "none"]
export const MANUAL_LEDGER_KINDS: readonly ManualLedgerKind[] = ["opening", "adjustment", "encashment"]

export interface LeaveTypeRef {
	id: number
	code: string
	name: Translatable
	unit: LeaveUnit
}

export interface LeaveType extends LeaveTypeRef {
	is_paid: boolean
	tracks_balance: boolean
	allows_half_day: boolean
	counts_calendar_days: boolean
	/** Shown to a manager's team view as plain leave, without its type. */
	hide_reason: boolean
	requires_attachment: boolean
	attachment_document_type_id: number | null
	is_active: boolean
}

export interface LeaveTypePayload {
	code: string
	name: Translatable
	/** Set on create only: UpdateLeaveTypeRequest takes no unit. */
	unit?: LeaveUnit
	is_paid: boolean
	tracks_balance: boolean
	allows_half_day: boolean
	counts_calendar_days: boolean
	hide_reason: boolean
	attachment_document_type_id: number | null
	is_active: boolean
}

export interface ServiceTier {
	min_years: number
	entitlement: string | number
}

export interface LeavePolicy {
	id: number
	leave_type_id: number
	name: Translatable | null
	effective_from: string
	effective_to: string | null
	accrual_method: AccrualMethod
	annual_entitlement: string
	service_tiers: ServiceTier[] | null
	carry_over_max: string | null
	carry_over_expiry_months: number | null
	max_negative: string
	/** Null: every contract type, grade or unit. */
	contract_types: ContractType[] | null
	job_grade_ids: number[] | null
	org_unit_ids: number[] | null
}

export interface LeavePolicyPayload {
	/** Create only. */
	leave_type_id?: number
	name: Translatable | null
	effective_from: string
	effective_to: string | null
	accrual_method: AccrualMethod
	annual_entitlement: number
	service_tiers: ServiceTier[] | null
	carry_over_max: number | null
	carry_over_expiry_months: number | null
	max_negative: number
	contract_types: ContractType[] | null
	job_grade_ids: number[] | null
	org_unit_ids: number[] | null
}

export interface Holiday {
	id: number
	name: Translatable
	starts_on: string
	ends_on: string
	recurs_annually: boolean
}

export interface HolidayPayload {
	name: Translatable
	starts_on: string
	ends_on: string
	recurs_annually: boolean
}

/** A minimum headcount at work, for one unit or one position (never both). */
export interface CoverageRule {
	id: number
	org_unit_id: number | null
	position_id: number | null
	min_present: number
	is_active: boolean
}

export interface CoverageRulePayload {
	org_unit_id?: number | null
	position_id?: number | null
	min_present: number
	is_active: boolean
}

export interface LeaveRequest {
	id: number
	employee: { id: number; employee_number: string; name: Translatable }
	leave_type: LeaveTypeRef
	starts_on: string
	ends_on: string
	half_day: HalfDay | null
	hours: string | null
	amount: string
	reason: string | null
	document_id: number | null
	status: LeaveRequestStatus
	approval: { id: number; status: string; current_step: number } | null
	created_at: string | null
	cancelled_at: string | null
}

/** `POST me/leave/requests` and `POST employees/{id}/leave-requests` (SubmitLeaveRequest). */
export interface SubmitLeavePayload {
	leave_type_id: number
	starts_on: string
	ends_on: string
	half_day: HalfDay | null
	hours: number | null
	reason: string | null
	attachment: File | null
}

/** One line of LeaveService::balances(): only the types the employee can take. */
export interface LeaveBalance {
	leave_type: LeaveTypeRef
	tracks_balance: boolean
	balance: string | null
	pending: string
	available: string | null
	max_negative: string | null
}

export interface LeaveQuote {
	amount: string
	unit: LeaveUnit
	/** Null for a type that keeps no balance. */
	available: string | null
	remaining_after: string | null
}

export interface LedgerEntry {
	id: number
	leave_type_id: number
	kind: LedgerKind
	amount: string
	effective_on: string
	period_year: number
	leave_request_id: number | null
	notes: string | null
	created_at: string | null
}

export interface LeaveAdjustmentPayload {
	leave_type_id: number
	kind: ManualLedgerKind
	amount: number
	effective_on: string | null
	period_year: number | null
	notes: string
}

/** `GET me/team/leave`: a hidden-reason type shows as null, and no reason is ever sent. */
export interface TeamLeave {
	id: number
	employee: { id: number; name: Translatable }
	leave_type: { id: number; code: string; name: Translatable } | null
	starts_on: string
	ends_on: string
	half_day: HalfDay | null
	hours: string | null
	status: LeaveRequestStatus
}
