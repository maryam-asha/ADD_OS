import type { ContractType, EmploymentType, Translatable, WorkMode } from "@/add-os/modules/hr/types/hr"
/**
 * HR recruitment (`add/hr` Recruitment module). Shapes read from ADD Core
 * `packages/add/hr/src/Recruitment/Http/Resources`, its Form Requests, and
 * the answers MyRecruitmentController builds inline. Times are LocalTime
 * ISO strings in the organisation's zone.
 */
import type { CompensationLine } from "@/add-os/modules/hr/types/payroll"

/**
 * What a pipeline stage means. Only `open` stages are added or edited and
 * moved to by hand; the others are fixed and reached by their own action
 * (making an offer, hiring, rejecting, withdrawing).
 */
export type StageType = "open" | "offer" | "hired" | "rejected" | "withdrawn"

export interface PipelineStage {
	id: number
	code: string
	name: Translatable
	type: StageType
	sort: number
	is_active: boolean
}

export type RequisitionStatus = "pending" | "approved" | "rejected" | "filled" | "closed" | "cancelled"
export const REQUISITION_STATUSES: readonly RequisitionStatus[] = ["pending", "approved", "rejected", "filled", "closed", "cancelled"]
export type RequisitionReason = "new_position" | "replacement"

export interface EmployeeRef {
	id: number
	employee_number: string
	name: Translatable
}

export interface Requisition {
	id: number
	title: Translatable
	org_unit?: { id: number; name: Translatable }
	org_unit_id: number
	position_id: number | null
	job_grade_id: number | null
	headcount: number
	/** Not while pending. */
	hired?: number
	employment_type: EmploymentType
	reason: RequisitionReason
	replaces_employee_id: number | null
	hiring_manager?: EmployeeRef | null
	budget_min: string | null
	budget_max: string | null
	budget_currency: string | null
	justification: string | null
	status: RequisitionStatus
	approval_request_id: number | null
	approved_at: string | null
	filled_at: string | null
	created_at: string | null
}

export interface RequisitionPayload {
	org_unit_id: number
	position_id: number | null
	job_grade_id: number | null
	title: Translatable
	headcount: number
	employment_type: EmploymentType
	reason: RequisitionReason
	replaces_employee_id: number | null
	budget_min: number | null
	budget_max: number | null
	budget_currency: string | null
	justification: string | null
	/** HR's own requisitions only; a manager filing for themselves is the hiring manager. */
	hiring_manager_id?: number
}

export type OpeningStatus = "draft" | "open" | "closed"
export const OPENING_STATUSES: readonly OpeningStatus[] = ["draft", "open", "closed"]
/** public: on the careers page and to employees; internal: to employees only. */
export type OpeningVisibility = "public" | "internal"

export interface JobOpening {
	id: number
	requisition_id: number
	title: Translatable | null
	description: Translatable | null
	employment_type: EmploymentType
	work_location?: { id: number; name: Translatable } | null
	visibility: OpeningVisibility
	status: OpeningStatus
	closes_on: string | null
	opened_at: string | null
	closed_at: string | null
	applications_count?: number
}

export interface JobOpeningPayload {
	title: Translatable | null
	description: Translatable | null
	employment_type: EmploymentType | null
	work_location_id: number | null
	visibility: OpeningVisibility
	closes_on: string | null
	/** On create: open it at once. */
	open?: boolean
}

/** An opening as employees (and the careers page) see it. */
export interface PublicJobOpening {
	id: number
	title: Translatable | null
	description: Translatable | null
	employment_type: EmploymentType
	location?: Translatable | null
	closes_on: string | null
}

export type CandidateSource = "careers" | "internal" | "referral" | "agency" | "direct"
/** The sources HR may record by hand (StoreApplicationRequest). */
export const MANUAL_SOURCES = ["direct", "referral", "agency"] as const

export interface Candidate {
	id: number
	name: string
	email: string | null
	phone: string | null
	source: CandidateSource
	employee_id: number | null
	consent_at: string | null
	notes: string | null
	applications?: Application[]
	created_at: string | null
}

export type InterviewMode = "in_person" | "video" | "phone"
export const INTERVIEW_MODES: readonly InterviewMode[] = ["in_person", "video", "phone"]
export type InterviewStatus = "scheduled" | "completed" | "cancelled"
export type Recommendation = "strong_yes" | "yes" | "no" | "strong_no"
export const RECOMMENDATIONS: readonly Recommendation[] = ["strong_yes", "yes", "no", "strong_no"]

export interface Scorecard {
	employee_id: number
	recommendation: Recommendation
	/** Criterion → 1–5. */
	ratings: Record<string, number> | null
	notes: string | null
	submitted_at: string | null
}

export interface Interview {
	id: number
	application_id: number
	/** The organisation's wall clock, ISO 8601. */
	scheduled_at: string
	duration_minutes: number
	mode: InterviewMode
	location: string | null
	notes: string | null
	status: InterviewStatus
	interviewers?: EmployeeRef[]
	scorecards?: Scorecard[]
}

export interface InterviewPayload {
	/** `yyyy-MM-dd HH:mm` in the organisation's zone. */
	scheduled_at: string
	duration_minutes: number
	mode: InterviewMode
	location: string | null
	interviewer_ids: number[]
	notes: string | null
}

/** Approved before it is made; the candidate then accepts or declines. */
export type OfferStatus = "pending" | "approved" | "rejected" | "accepted" | "declined" | "withdrawn"

export interface Offer {
	id: number
	application_id: number
	start_on: string
	expires_on: string | null
	compensation: CompensationLine[] | null
	terms: string | null
	status: OfferStatus
	approval_request_id: number | null
	responded_at: string | null
	response_note: string | null
	created_at: string | null
}

export interface OfferPayload {
	start_on: string
	expires_on: string | null
	compensation: CompensationLine[] | null
	terms: string | null
}

export interface Application {
	id: number
	opening?: { id: number; title: Translatable | null }
	candidate?: Candidate
	/** A stage code. */
	stage: string
	stage_changed_at: string | null
	source: CandidateSource
	referred_by?: EmployeeRef | null
	cover_letter: string | null
	cv: { name: string; mime: string; size: number } | null
	rejection_reason: string | null
	employee_id: number | null
	history?: { from: string | null; to: string; note: string | null; by: number | null; at: string | null }[]
	interviews?: Interview[]
	offers?: Offer[]
	created_at: string | null
}

export interface NewApplicationPayload {
	candidate_id?: number
	name?: string
	email?: string | null
	phone?: string | null
	source: (typeof MANUAL_SOURCES)[number]
	referred_by_employee_id?: number | null
	cover_letter?: string | null
	cv?: File | null
}

/** What the hire takes beyond what the requisition and the accepted offer already give. */
export interface HireCandidatePayload {
	hired_on: string
	contract: { type: ContractType }
	assignment: { work_mode: WorkMode }
}

export interface MyApplication {
	id: number
	opening: { id: number; title: Translatable | null }
	stage: string
	applied_at: string | null
}

export interface MyInterview {
	id: number
	scheduled_at: string
	duration_minutes: number
	mode: InterviewMode
	location: string | null
	status: InterviewStatus
	candidate: { name: string }
	opening: { id: number; title: Translatable | null }
	my_scorecard: { recommendation: Recommendation; ratings: Record<string, number> | null; notes: string | null } | null
}

export interface ScorecardPayload {
	recommendation: Recommendation
	ratings: Record<string, number> | null
	notes: string | null
}
