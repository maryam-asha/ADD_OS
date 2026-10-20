/**
 * HR performance under `/api/v1/hr`. Reading needs hr.performance.view,
 * every change hr.performance.manage. `hr/me/*` is the employee's side:
 * their goals (and a direct report's), their reviews and self review, and
 * the reviews they conduct; who may do what there is checked per record.
 *
 * Routes, rules and shapes read from ADD Core
 * `packages/add/hr/routes/performance/{admin,self}.php` and
 * `src/Performance/Http`.
 */

import type { Paginated, RawPaginatedResponse } from "../pagination"
import type { UpdateResult } from "./core"
import type {
	CycleStatus,
	Goal,
	GoalPayload,
	GoalStatus,
	Review,
	ReviewCycle,
	ReviewCyclePayload,
	ReviewStatus,
	ReviewTemplate,
	ReviewTemplatePayload,
	SubmitReviewPayload
} from "@/add-os/modules/hr/types/performance"
import { del, get, patch, post, put } from "../api"
import { rowsOf, toPaginated } from "../pagination"

const BASE = "/api/v1/hr"

function query(page: number | undefined, filters: Record<string, unknown>): Record<string, unknown> {
	const q: Record<string, unknown> = { page: page ?? 1 }
	for (const [key, value] of Object.entries(filters)) {
		if (value !== null && value !== undefined && value !== "") q[key] = value
	}
	return q
}

// ── Templates ───────────────────────────────────────────────────────────────

export async function listTemplates(): Promise<ReviewTemplate[]> {
	return rowsOf<ReviewTemplate>((await get<{ data: ReviewTemplate[] }>(`${BASE}/review-templates`)).data)
}

export async function createTemplate(payload: ReviewTemplatePayload): Promise<ReviewTemplate> {
	return (await post<{ data: ReviewTemplate }>(`${BASE}/review-templates`, payload)).data
}

/** A cycle keeps the template as it was at its launch; changing it reaches only later cycles. */
export async function updateTemplate(id: number, payload: Partial<ReviewTemplatePayload>): Promise<UpdateResult> {
	return patch<UpdateResult>(`${BASE}/review-templates/${id}`, payload)
}

// ── Cycles ──────────────────────────────────────────────────────────────────

export async function listCycles(filters: { page?: number; status?: CycleStatus | null } = {}): Promise<Paginated<ReviewCycle>> {
	const { page, ...rest } = filters
	return toPaginated(await get<RawPaginatedResponse<ReviewCycle>>(`${BASE}/review-cycles`, query(page, rest)))
}

/** A cycle with how many of its reviews stand at each status. */
export async function getCycle(id: number): Promise<ReviewCycle> {
	return (await get<{ data: ReviewCycle }>(`${BASE}/review-cycles/${id}`)).data
}

export async function createCycle(payload: ReviewCyclePayload): Promise<ReviewCycle> {
	return (await post<{ data: ReviewCycle }>(`${BASE}/review-cycles`, payload)).data
}

/** While a draft only. */
export async function updateCycle(id: number, payload: Partial<ReviewCyclePayload>): Promise<UpdateResult> {
	return patch<UpdateResult>(`${BASE}/review-cycles/${id}`, payload)
}

/** Opens a review for everyone employed in its scope today, their manager as reviewer; goal setting opens. */
export async function launchCycle(id: number): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/review-cycles/${id}/launch`)
}

/** The next phase; moving to closed finalizes every review. */
export async function advanceCycle(id: number): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/review-cycles/${id}/advance`)
}

export async function listCycleReviews(id: number, filters: { page?: number; status?: ReviewStatus | null; reviewer_id?: number | null } = {}): Promise<Paginated<Review>> {
	const { page, ...rest } = filters
	return toPaginated(await get<RawPaginatedResponse<Review>>(`${BASE}/review-cycles/${id}/reviews`, query(page, rest)))
}

/** Someone the launch left out (hired since, moved into the unit), while the cycle runs. */
export async function addToCycle(id: number, employeeId: number): Promise<Review> {
	return (await post<{ data: Review }>(`${BASE}/review-cycles/${id}/reviews`, { employee_id: employeeId })).data
}

// ── Reviews ─────────────────────────────────────────────────────────────────

/** A review with every item, as HR sees it. */
export async function getReview(id: number): Promise<Review> {
	return (await get<{ data: Review }>(`${BASE}/reviews/${id}`)).data
}

/** Until the reviewer has rated it; never the employee themselves. */
export async function reassignReviewer(id: number, reviewerId: number): Promise<UpdateResult> {
	return patch<UpdateResult>(`${BASE}/reviews/${id}`, { reviewer_id: reviewerId })
}

/** During calibration, a rated review's score set by HR (1 to the scale). */
export async function calibrateReview(id: number, score: number, note: string | null): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/reviews/${id}/calibrate`, { score, note })
}

// ── Goals ───────────────────────────────────────────────────────────────────

export async function listGoals(filters: { page?: number; employee_id?: number | null; review_cycle_id?: number | null; status?: GoalStatus | null } = {}): Promise<Paginated<Goal>> {
	const { page, ...rest } = filters
	return toPaginated(await get<RawPaginatedResponse<Goal>>(`${BASE}/goals`, query(page, rest)))
}

export async function createGoal(employeeId: number, payload: GoalPayload): Promise<Goal> {
	return (await post<{ data: Goal }>(`${BASE}/employees/${employeeId}/goals`, payload)).data
}

/** Once its cycle leaves goal setting, only progress and status change. */
export async function updateGoal(id: number, payload: Partial<GoalPayload>): Promise<UpdateResult> {
	return patch<UpdateResult>(`${BASE}/goals/${id}`, payload)
}

export async function deleteGoal(id: number): Promise<UpdateResult> {
	await del<void>(`${BASE}/goals/${id}`)
	return {}
}

// ── My performance (hr/me) ──────────────────────────────────────────────────

/** My goals, or a direct report's. */
export async function myGoals(employeeId?: number | null): Promise<Goal[]> {
	return rowsOf<Goal>((await get<{ data: Goal[] }>(`${BASE}/me/goals`, employeeId ? { employee_id: employeeId } : undefined)).data)
}

export async function createMyGoal(payload: GoalPayload): Promise<Goal> {
	return (await post<{ data: Goal }>(`${BASE}/me/goals`, payload)).data
}

export async function updateMyGoal(id: number, payload: Partial<GoalPayload>): Promise<UpdateResult> {
	return patch<UpdateResult>(`${BASE}/me/goals/${id}`, payload)
}

/** My reviews in launched cycles, without the manager's side until finalized. */
export async function myReviews(): Promise<Review[]> {
	return rowsOf<Review>((await get<{ data: Review[] }>(`${BASE}/me/reviews`)).data)
}

export async function getMyReview(id: number): Promise<Review> {
	return (await get<{ data: Review }>(`${BASE}/me/reviews/${id}`)).data
}

/** During self review; may rate only some items. */
export async function submitSelfReview(id: number, payload: SubmitReviewPayload): Promise<UpdateResult> {
	return put<UpdateResult>(`${BASE}/me/reviews/${id}/self`, payload)
}

/** The reviews I conduct. */
export async function teamReviews(): Promise<Review[]> {
	return rowsOf<Review>((await get<{ data: Review[] }>(`${BASE}/me/team-reviews`)).data)
}

export async function getTeamReview(id: number): Promise<Review> {
	return (await get<{ data: Review }>(`${BASE}/me/team-reviews/${id}`)).data
}

/** During manager review; every competency and goal must be rated. */
export async function submitManagerReview(id: number, payload: SubmitReviewPayload): Promise<UpdateResult> {
	return put<UpdateResult>(`${BASE}/me/team-reviews/${id}`, payload)
}
