/**
 * HR payroll (`add/hr` Payroll module). Shapes read from ADD Core
 * `packages/add/hr/src/Payroll/Http/Resources`, its Form Requests, the
 * answers PayrollRunController, EndOfServiceController and PayrollVariance
 * build inline, and the journal rows of Integrations/CostCenterJournal.
 * Money is a decimal string, never computed here.
 */
import type { Translatable } from "@/add-os/modules/hr/types/hr"

export type PayComponentKind = "earning" | "deduction" | "employer_contribution" | "in_kind"
export const PAY_COMPONENT_KINDS: readonly PayComponentKind[] = ["earning", "deduction", "employer_contribution", "in_kind"]

/**
 * The built-in calculators (CalculatorRegistry::BUILT_IN). The server may
 * register more under hr.payroll.calculators; `GET payroll-calculators`
 * lists them all, and one not named here is configured as raw JSON.
 */
export const KNOWN_CALCULATORS = ["fixed", "per_attendance_day", "percent_of", "rate_table", "overtime", "unpaid_days", "loan_installment", "benefit_allowance"] as const
export type KnownCalculator = (typeof KNOWN_CALCULATORS)[number]

/** A calculator's settings; which keys apply depends on the calculator. */
export type ComponentConfig = Record<string, unknown>

export interface PayComponent {
	id: number
	code: string
	name: Translatable
	kind: PayComponentKind
	calculator: string
	config: ComponentConfig | null
	applies_to_all: boolean
	taxable: boolean
	insurable: boolean
	sort: number
	is_active: boolean
}

export interface PayComponentPayload {
	code: string
	name: Translatable
	kind: PayComponentKind
	calculator: string
	config: ComponentConfig | null
	applies_to_all: boolean
	taxable: boolean
	insurable: boolean
	sort: number
	is_active: boolean
}

export type RateTableKind = "percent" | "brackets"

export interface RateBracket {
	/** Null for the open-ended top band. */
	up_to: string | number | null
	rate: string | number
}

export interface RateTableVersion {
	id: number
	effective_from: string
	effective_to: string | null
	rate: string | null
	max_base: string | null
	brackets: RateBracket[] | null
	currency: string | null
	note: string | null
}

export interface RateTable {
	id: number
	code: string
	name: Translatable
	kind: RateTableKind
	versions?: RateTableVersion[]
}

export interface RateTablePayload {
	code: string
	name: Translatable
	kind?: RateTableKind
}

export interface RateVersionPayload {
	effective_from: string
	effective_to: string | null
	rate?: number
	max_base?: number | null
	brackets?: { up_to: number | null; rate: number }[]
	currency: string | null
	note: string | null
}

export interface Compensation {
	id: number
	component: { id: number; code: string; name: Translatable; kind: PayComponentKind }
	amount: string
	currency: string
	effective_from: string
	effective_to: string | null
	event_id: number | null
}

export interface CompensationLine {
	pay_component_id: number
	amount: number
	currency: string
}

export type PayrollRunKind = "regular" | "off_cycle"
export type PayrollRunStatus = "open" | "calculated" | "reviewed" | "approved" | "paid"
export const PAYROLL_RUN_STATUSES: readonly PayrollRunStatus[] = ["open", "calculated", "reviewed", "approved", "paid"]

export interface PayrollRunTotals {
	payslips: number
	gross: string
	deductions: string
	net: string
	employer_cost: string
	warnings: number
}

export interface PayrollRun {
	id: number
	year: number
	month: number
	kind: PayrollRunKind
	currency: string
	status: PayrollRunStatus
	employee_ids: number[] | null
	exchange_rates: Record<string, string> | null
	parallel_run: boolean
	reconciled_at: string | null
	notes: string | null
	/** Only on `GET payroll-runs/{id}`, which loads the payslips. */
	totals?: PayrollRunTotals
	calculated_at: string | null
	calculated_by: number | null
	reviewed_at: string | null
	reviewed_by: number | null
	approved_at: string | null
	approved_by: number | null
	paid_at: string | null
	payment_reference: string | null
	posted_at: string | null
}

export interface OpenPayrollRunPayload {
	year: number
	month: number
	kind: PayrollRunKind
	currency: string | null
	parallel_run: boolean
	employee_ids: number[] | null
	notes: string | null
}

/** What the employee was when the slip was calculated; it never changes after. */
export interface PayslipSnapshot {
	employee_number: string
	name: Translatable
	job_title: Translatable | null
	org_unit: Translatable | null
	hired_on: string
	terminated_on: string | null
}

export interface PayslipLine {
	code: string
	name: Translatable
	kind: PayComponentKind
	basis: string | null
	quantity: string | null
	rate: string | null
	amount: string
	original_amount: string | null
	original_currency: string | null
}

export interface Payslip {
	id: number
	payroll_run_id: number
	/** `yyyy-MM`, when the run is loaded. */
	period?: string
	employee_id: number
	employee: PayslipSnapshot
	currency: string
	gross: string
	deductions: string
	net: string
	/** HR routes only; never on the employee's own slip. */
	employer_cost?: string
	employed_days: number
	days_in_month: number
	/** e.g. "negative_net", "no_rate_in_force:SOCIAL". */
	warnings: string[] | null
	published_at: string | null
	lines?: PayslipLine[]
}

export interface PayrollAdjustment {
	id: number
	employee_id: number
	component: { id: number; code: string }
	amount: string
	currency: string
	note: string
}

export interface AdjustmentPayload {
	employee_id: number
	pay_component_id: number
	amount: number
	currency: string
	note: string
}

export interface VarianceRow {
	employee_id: number
	name: Translatable | null
	status: "new" | "left" | "continuing"
	gross: { previous: string | null; current: string | null }
	net: { previous: string | null; current: string | null; change: string; percent: string | null }
	components: { code: string; previous: string; current: string }[]
	flagged: boolean
}

export interface PayrollVariance {
	previous_run_id: number | null
	rows: VarianceRow[]
}

export interface JournalRow {
	account: string
	cost_center: string
	employee_number: string
	debit: string
	credit: string
	currency: string
}

export type LoanStatus = "pending" | "active" | "settled" | "rejected" | "cancelled"
export const LOAN_STATUSES: readonly LoanStatus[] = ["pending", "active", "settled", "rejected", "cancelled"]
export type InstallmentStatus = "due" | "deducted" | "settled"

export interface Loan {
	id: number
	employee?: { id: number; name: Translatable }
	amount: string
	currency: string
	installments: number
	installment_amount: string
	/** `yyyy-MM`. */
	first_month: string
	reason: string | null
	status: LoanStatus
	approval_request_id: number | null
	outstanding: string
	schedule: { month: string; amount: string; status: InstallmentStatus }[]
}

export interface LoanPayload {
	amount: number
	currency: string
	installments: number
	first_month: string | null
	reason: string | null
}

export interface EndOfServiceEstimate {
	service_years: string
	monthly_basis: string
	days: string
	amount: string
	currency: string
	rule: string
}

export interface EndOfServiceLiability {
	as_of: string
	/** Total owed by currency. */
	totals: Record<string, string>
	employees: ({ employee: { id: number; employee_number: string; name: Translatable } } & EndOfServiceEstimate)[]
}

/** An active currency as `GET /api/v1/currencies` lists it — the codes HR amounts may use. */
export interface CurrencyOption {
	code: string
	name: string | null
	symbol: string | null
}
