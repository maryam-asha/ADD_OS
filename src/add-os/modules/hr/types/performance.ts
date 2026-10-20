/**
 * HR performance (`add/hr` Performance module). Shapes read from ADD Core
 * `packages/add/hr/src/Performance/Http/Resources` and its Form Requests.
 * Scores are decimal strings worked out by the server.
 */
import type { Translatable } from "@/add-os/modules/hr/types/hr"

/** A cycle's phases in order; HR moves it one step at a time. */
export type CycleStatus = "draft" | "goal_setting" | "self_review" | "manager_review" | "calibration" | "closed"
export const CYCLE_STATUSES: readonly CycleStatus[] = ["draft", "goal_setting", "self_review", "manager_review", "calibration", "closed"]

export type GoalStatus = "active" | "completed" | "cancelled"
export const GOAL_STATUSES: readonly GoalStatus[] = ["active", "completed", "cancelled"]

export type ReviewStatus = "open" | "self_submitted" | "manager_submitted" | "finalized"
export const REVIEW_STATUSES: readonly ReviewStatus[] = ["open", "self_submitted", "manager_submitted", "finalized"]

/** What a reviewer suggests; never applied by itself — HR records any promotion or pay change. */
export type ReviewRecommendation = "none" | "promotion" | "compensation_change" | "improvement_plan"
export const RECOMMENDATIONS: readonly ReviewRecommendation[] = ["none", "promotion", "compensation_change", "improvement_plan"]

export interface Competency {
	code: string
	name: Translatable
	weight: number | null
}

export interface ReviewTemplate {
	id: number
	name: Translatable
	/** Ratings run from 1 to this (3–10). */
	scale_max: number
	competencies: Competency[]
	/** The share of the overall score that goals carry (0–100). */
	goals_weight: number
	is_active: boolean
}

export interface ReviewTemplatePayload {
	name: Translatable
	scale_max: number
	competencies: Competency[]
	goals_weight: number
	is_active: boolean
}

export interface ReviewCycle {
	id: number
	name: Translatable
	review_template_id: number
	/** The template as it was at launch; null while a draft. */
	template: Pick<ReviewTemplate, "scale_max" | "competencies" | "goals_weight"> | null
	period_start: string
	period_end: string
	/** Null: everyone; else the unit and the units under it. */
	org_unit_id: number | null
	status: CycleStatus
	goals_due_on: string | null
	self_due_on: string | null
	manager_due_on: string | null
	launched_at: string | null
	closed_at: string | null
	/** On `GET review-cycles/{id}` only. */
	reviews_by_status?: Partial<Record<ReviewStatus, number>>
}

export interface ReviewCyclePayload {
	name: Translatable
	review_template_id: number
	period_start: string
	period_end: string
	org_unit_id: number | null
	goals_due_on: string | null
	self_due_on: string | null
	manager_due_on: string | null
}

export interface Goal {
	id: number
	employee_id: number
	review_cycle_id: number | null
	title: string
	description: string | null
	metric: string | null
	target: string | null
	/** Its share of the cycle's goals (a cycle's goals weigh 100 at most). */
	weight: number
	/** 0–100. */
	progress: number
	status: GoalStatus
	due_on: string | null
}

export interface GoalPayload {
	title: string
	description: string | null
	metric: string | null
	target: string | null
	weight: number
	progress: number
	due_on: string | null
	review_cycle_id?: number | null
	status?: GoalStatus
	/** Self-service, for a direct report. */
	employee_id?: number
}

export interface PersonRef {
	id: number
	employee_number: string
	name: Translatable
}

export type AnswerKind = "competency" | "goal"

/** One thing a review rates: a competency (by code) or a goal (by id). */
export interface ReviewItem {
	kind: AnswerKind
	key: string
	name: Translatable | string
	self_rating: number | null
	self_comment: string | null
	manager_rating: number | null
	manager_comment: string | null
}

/**
 * A review as its reader may see it: the employee sees the manager's side
 * only once it is finalized; the reviewer sees the self review once it is
 * submitted; HR sees everything, calibration included.
 */
export interface Review {
	id: number
	cycle: { id: number; name: Translatable; status: CycleStatus; period_start: string; period_end: string; scale_max: number }
	employee: PersonRef | null
	reviewer: PersonRef | null
	status: ReviewStatus
	/** With `GET …/reviews/{id}` only. */
	items?: ReviewItem[]
	self_comment: string | null
	self_submitted_at: string | null
	manager_comment: string | null
	manager_submitted_at: string | null
	/** Never for the employee. */
	recommendation?: ReviewRecommendation | null
	scores: { competencies: string | null; goals: string | null; overall: string | null } | null
	/** HR only. */
	calibrated_score?: string | null
	calibration_note?: string | null
	final_rating: number | null
	finalized_at: string | null
}

export interface ReviewAnswer {
	kind: AnswerKind
	key: string
	rating: number
	comment: string | null
}

export interface SubmitReviewPayload {
	answers: ReviewAnswer[]
	comment: string | null
	/** The reviewer's only. */
	recommendation?: ReviewRecommendation | null
}
