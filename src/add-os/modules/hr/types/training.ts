/**
 * HR training (`add/hr` Training module). Shapes read from ADD Core
 * `packages/add/hr/src/Training/Http/Resources`, its Form Requests and
 * LearningBudgetController (whose budgets are plain JSON, not Resources).
 * Money, hours and scores are decimal strings.
 */
import type { PersonRef, Translatable } from "@/add-os/modules/hr/types/hr"

export type Delivery = "in_person" | "online" | "blended"
export const DELIVERIES: readonly Delivery[] = ["in_person", "online", "blended"]

export type SessionStatus = "scheduled" | "completed" | "cancelled"
export const SESSION_STATUSES: readonly SessionStatus[] = ["scheduled", "completed", "cancelled"]

export type EnrollmentStatus = "enrolled" | "completed" | "no_show" | "cancelled"
export const ENROLLMENT_STATUSES: readonly EnrollmentStatus[] = ["enrolled", "completed", "no_show", "cancelled"]

/** A request to spend the budget, decided in the approval flow (type `learning`). */
export type LearningRequestStatus = "pending" | "approved" | "rejected" | "cancelled"
export const LEARNING_REQUEST_STATUSES: readonly LearningRequestStatus[] = ["pending", "approved", "rejected", "cancelled"]

/** Allocations add, spending subtracts, adjustments go either way. */
export type BudgetEntryKind = "allocation" | "spend" | "adjustment"

export interface Course {
	id: number
	code: string
	title: Translatable
	description: Translatable | null
	provider: string | null
	delivery: Delivery
	duration_hours: string | null
	cost: string | null
	currency: string | null
	/** Completing a session of this course grants it; none, no certification. */
	certification_name: Translatable | null
	certification_valid_months: number | null
	is_active: boolean
}

export interface CoursePayload {
	code: string
	title: Translatable
	description: Translatable | null
	provider: string | null
	delivery: Delivery
	duration_hours: number | null
	cost: number | null
	currency: string | null
	certification_name: Translatable | null
	certification_valid_months: number | null
	is_active: boolean
}

export interface TrainingSession {
	id: number
	course?: { id: number; code: string; title: Translatable; delivery: Delivery }
	starts_on: string
	ends_on: string
	location: string | null
	trainer: string | null
	/** Null: no limit. */
	capacity: number | null
	/** Enrollments that are not cancelled; on lists and the session itself. */
	seats_taken?: number
	self_enrollment: boolean
	status: SessionStatus
}

export interface TrainingSessionPayload {
	course_id?: number
	starts_on: string
	ends_on: string
	location: string | null
	trainer: string | null
	capacity: number | null
	self_enrollment: boolean
}

export interface Enrollment {
	id: number
	/** On the employee's own enrollments. */
	session?: TrainingSession
	/** On a session's enrollments. */
	employee?: PersonRef
	status: EnrollmentStatus
	completed_on: string | null
	/** 0–100, given when the session is completed. */
	score: string | null
}

export interface CompleteSessionPayload {
	no_show_ids: number[]
	scores: { enrollment_id: number; score: number }[]
}

export interface Certification {
	id: number
	employee_id: number
	/** The course that granted it; null for one earned outside. */
	course_id: number | null
	name: Translatable
	issuer: string | null
	issued_on: string
	expires_on: string | null
	reference: string | null
}

export interface CertificationPayload {
	name: Translatable
	course_id: number | null
	issuer: string | null
	issued_on: string
	expires_on: string | null
	reference: string | null
}

/** A row of `GET learning-budgets`: one employee's year. */
export interface BudgetBalance {
	employee: { id: number; employee_number: string | null; name: Translatable | null }
	year: number
	/** The sum of the year's entries. */
	balance: string
	/** The balance less the requests still pending. */
	available: string
	currency: string
}

export interface BudgetEntry {
	id: number
	kind: BudgetEntryKind
	/** Signed: spending is negative. */
	amount: string
	learning_request_id: number | null
	note: string | null
	created_at: string | null
}

/** An employee's year; `entries` only on the HR side. */
export interface LearningBudget {
	year: number
	balance: string
	available: string
	currency: string
	entries?: BudgetEntry[]
}

export interface LearningRequest {
	id: number
	employee_id: number
	course_id: number | null
	title: string
	provider: string | null
	starts_on: string | null
	/** The budget year it draws on: that of its start, else the year it was asked. */
	year: number
	amount: string
	currency: string
	justification: string | null
	status: LearningRequestStatus
	approval_request_id: number | null
	created_at: string | null
}

export interface LearningRequestPayload {
	title: string
	provider: string | null
	starts_on: string | null
	amount: number
	justification: string | null
}
