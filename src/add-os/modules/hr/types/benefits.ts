/**
 * HR benefits (`add/hr` Benefits module). Shapes read from ADD Core
 * `packages/add/hr/src/Benefits/Http/Resources`, its Form Requests, and the
 * answers BenefitController::forEmployee, BenefitGrantController and
 * MyBenefitsController build inline. Money is a decimal string.
 */
import type { Translatable } from "@/add-os/modules/hr/types/hr"

/**
 * cash_allowance: money paid through payroll, as an earning line.
 * in_kind_credit: units the host delivers — in ADD, wallet points.
 * entitlement: recorded for its cost only (insurance cover, a membership).
 */
export type BenefitKind = "cash_allowance" | "in_kind_credit" | "entitlement"
export const BENEFIT_KINDS: readonly BenefitKind[] = ["cash_allowance", "in_kind_credit", "entitlement"]

export type BenefitFrequency = "monthly" | "quarterly" | "yearly" | "one_time"
export const BENEFIT_FREQUENCIES: readonly BenefitFrequency[] = ["monthly", "quarterly", "yearly", "one_time"]

/** Pending: in kind, waiting for delivery; cash, waiting for its payroll. */
export type BenefitGrantStatus = "pending" | "fulfilled" | "failed" | "cancelled"
export const BENEFIT_GRANT_STATUSES: readonly BenefitGrantStatus[] = ["pending", "fulfilled", "failed", "cancelled"]

/**
 * How ADD delivers an in-kind benefit: wallet points on the employee's own
 * member wallet (AddWalletBenefitFulfiller, bound by the host). The server
 * takes `points` as the only unit, whole numbers only, and these pockets;
 * café and printing points expire `expires_after_days` after the grant, or
 * at the end of the period granted.
 */
export const IN_KIND_UNIT = "points"
export const WALLET_CATEGORIES = ["general", "cafe", "printing_internet"] as const
export type WalletCategory = (typeof WALLET_CATEGORIES)[number]

export interface BenefitFulfillment {
	category?: WalletCategory
	expires_after_days?: number | null
}

export interface Benefit {
	id: number
	code: string
	name: Translatable
	description: Translatable | null
	kind: BenefitKind
	frequency: BenefitFrequency
	/** Yearly only: the month (1–12) its grant falls in; none means January. */
	grant_month: number | null
	amount: string
	currency: string | null
	unit: string | null
	employer_cost: string | null
	cost_currency: string | null
	pay_component_id: number | null
	fulfillment: BenefitFulfillment | null
	eligible_after_days: number
	is_active: boolean
	assignments_count?: number
}

export interface BenefitPayload {
	code?: string
	name: Translatable
	description?: Translatable | null
	kind?: BenefitKind
	frequency?: BenefitFrequency
	grant_month?: number | null
	amount: number
	currency?: string | null
	unit?: string | null
	employer_cost?: number | null
	cost_currency?: string | null
	pay_component_id?: number | null
	fulfillment?: BenefitFulfillment | null
	eligible_after_days: number
	is_active: boolean
}

export type AssignmentTarget = "employee" | "grade" | "org_unit"

export interface BenefitAssignment {
	id: number
	benefit_id: number
	benefit?: Benefit
	target: AssignmentTarget
	employee?: { id: number; employee_number: string; name: Translatable } | null
	job_grade?: { id: number; name: Translatable } | null
	org_unit?: { id: number; name: Translatable } | null
	employee_id: number | null
	job_grade_id: number | null
	org_unit_id: number | null
	/** Overrides the benefit's amount for this target; null takes the benefit's. */
	amount: string | null
	employer_cost: string | null
	/** An employee's own assignment that takes the benefit away. */
	excluded: boolean
	effective_from: string
	effective_to: string | null
}

export interface AssignmentPayload {
	employee_id?: number
	job_grade_id?: number
	org_unit_id?: number
	amount: number | null
	employer_cost?: number | null
	excluded?: boolean
	effective_from: string
	effective_to: string | null
}

export interface BenefitGrant {
	id: number
	benefit?: { id: number; code: string; name: Translatable; kind: BenefitKind }
	employee?: { id: number; employee_number: string; name: Translatable }
	/** "2026-10", "2026-Q4", "2026" or "once". */
	period: string
	granted_on: string
	amount: string
	currency: string | null
	unit: string | null
	employer_cost: string | null
	cost_currency: string | null
	status: BenefitGrantStatus
	reference: string | null
	/** Why delivery failed, in words HR can act on. */
	failure: string | null
	attempts: number
	fulfilled_at: string | null
	payslip_id: number | null
}

export interface EmployeeBenefits {
	as_of: string
	/** The deciding assignment of each benefit the employee holds, the benefit loaded. */
	benefits: (BenefitAssignment & { benefit: Benefit })[]
	grants: BenefitGrant[]
}

export interface GrantRunResult {
	month: string
	granted: number
	fulfilled: number
	failed: number
}

export interface EmployeeCostLine {
	currency: string
	payroll: string
	benefits: string
	total: string
}

export interface EmployeeCostReport {
	month: string
	/** By currency. */
	totals: Record<string, { payroll: string; benefits: string; total: string }>
	employees: { employee: { id: number; employee_number: string; name: Translatable }; costs: EmployeeCostLine[] }[]
}

export interface MyBenefits {
	benefits: { code: string; name: Translatable; description: Translatable | null; kind: BenefitKind; frequency: BenefitFrequency; amount: string; currency: string | null; unit: string | null }[]
	grants: { id: number; benefit: { code: string; name: Translatable; kind: BenefitKind }; period: string; granted_on: string; amount: string; currency: string | null; unit: string | null; status: BenefitGrantStatus }[]
}
