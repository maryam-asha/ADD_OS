/**
 * HR training under `/api/v1/hr`. Reading needs hr.training.view, every
 * change hr.training.manage. `hr/me/*` is the employee's side: sessions
 * open to enroll themselves, their enrollments and certifications, their
 * learning budget and their requests to spend it.
 *
 * Routes, rules and shapes read from ADD Core
 * `packages/add/hr/routes/training/{admin,self}.php` and `src/Training/Http`.
 */

import type { Paginated, RawPaginatedResponse } from "../pagination"
import type { UpdateResult } from "./core"
import type {
	BudgetBalance,
	Certification,
	CertificationPayload,
	CompleteSessionPayload,
	Course,
	CoursePayload,
	Enrollment,
	LearningBudget,
	LearningRequest,
	LearningRequestPayload,
	LearningRequestStatus,
	SessionStatus,
	TrainingSession,
	TrainingSessionPayload
} from "@/add-os/modules/hr/types/training"
import { del, get, patch, post } from "../api"
import { rowsOf, toPaginated } from "../pagination"

const BASE = "/api/v1/hr"

function query(page: number | undefined, filters: Record<string, unknown>): Record<string, unknown> {
	const q: Record<string, unknown> = { page: page ?? 1 }
	for (const [key, value] of Object.entries(filters)) {
		if (value !== null && value !== undefined && value !== "") q[key] = value
	}
	return q
}

// ── Courses ─────────────────────────────────────────────────────────────────

/** The whole catalogue by code; `is_active` narrows it. */
export async function listCourses(filters: { is_active?: boolean | null } = {}): Promise<Course[]> {
	const q = filters.is_active === null || filters.is_active === undefined ? undefined : { is_active: filters.is_active ? 1 : 0 }
	return rowsOf<Course>((await get<{ data: Course[] }>(`${BASE}/courses`, q)).data)
}

export async function getCourse(id: number): Promise<Course> {
	return (await get<{ data: Course }>(`${BASE}/courses/${id}`)).data
}

export async function createCourse(payload: CoursePayload): Promise<Course> {
	return (await post<{ data: Course }>(`${BASE}/courses`, payload)).data
}

export async function updateCourse(id: number, payload: Partial<CoursePayload>): Promise<UpdateResult> {
	return patch<UpdateResult>(`${BASE}/courses/${id}`, payload)
}

// ── Sessions ────────────────────────────────────────────────────────────────

/** Latest first, with the seats taken; `from` keeps those ending on or after it. */
export async function listSessions(filters: { page?: number; status?: SessionStatus | null; course_id?: number | null; from?: string | null } = {}): Promise<Paginated<TrainingSession>> {
	const { page, ...rest } = filters
	return toPaginated(await get<RawPaginatedResponse<TrainingSession>>(`${BASE}/training-sessions`, query(page, rest)))
}

export async function getSession(id: number): Promise<TrainingSession> {
	return (await get<{ data: TrainingSession }>(`${BASE}/training-sessions/${id}`)).data
}

/** Of an active course; it opens scheduled. */
export async function createSession(payload: TrainingSessionPayload): Promise<TrainingSession> {
	return (await post<{ data: TrainingSession }>(`${BASE}/training-sessions`, payload)).data
}

/** While scheduled only; the course stays. */
export async function updateSession(id: number, payload: Partial<TrainingSessionPayload>): Promise<UpdateResult> {
	return patch<UpdateResult>(`${BASE}/training-sessions/${id}`, payload)
}

/** Cancels its enrollments too, and tells those enrolled. */
export async function cancelSession(id: number): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/training-sessions/${id}/cancel`)
}

/**
 * Once its last day has come: every enrollment still enrolled completes,
 * but the no-shows, and the course's certification is granted.
 */
export async function completeSession(id: number, payload: CompleteSessionPayload): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/training-sessions/${id}/complete`, payload)
}

export async function listSessionEnrollments(id: number): Promise<Enrollment[]> {
	return rowsOf<Enrollment>((await get<{ data: Enrollment[] }>(`${BASE}/training-sessions/${id}/enrollments`)).data)
}

/** Every listed employee, or none: any one refused stops them all. */
export async function enrollEmployees(id: number, employeeIds: number[]): Promise<Enrollment[]> {
	return rowsOf<Enrollment>((await post<{ data: Enrollment[] }>(`${BASE}/training-sessions/${id}/enrollments`, { employee_ids: employeeIds })).data)
}

/** HR may cancel any time while the session is scheduled. */
export async function cancelEnrollment(id: number): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/enrollments/${id}/cancel`)
}

// ── Certifications ──────────────────────────────────────────────────────────

/** Latest first; `expires_before` keeps those expiring on or before a day. */
export async function listCertifications(filters: { page?: number; employee_id?: number | null; expires_before?: string | null } = {}): Promise<Paginated<Certification>> {
	const { page, ...rest } = filters
	return toPaginated(await get<RawPaginatedResponse<Certification>>(`${BASE}/certifications`, query(page, rest)))
}

/** One earned outside, recorded on the employee's file. */
export async function recordCertification(employeeId: number, payload: CertificationPayload): Promise<Certification> {
	return (await post<{ data: Certification }>(`${BASE}/employees/${employeeId}/certifications`, payload)).data
}

export async function updateCertification(id: number, payload: Partial<CertificationPayload>): Promise<UpdateResult> {
	return patch<UpdateResult>(`${BASE}/certifications/${id}`, payload)
}

export async function deleteCertification(id: number): Promise<UpdateResult> {
	await del<void>(`${BASE}/certifications/${id}`)
	return {}
}

// ── Learning budgets ────────────────────────────────────────────────────────

/** Everyone with an entry in the year (this year by default). */
export async function listBudgets(year?: number | null): Promise<BudgetBalance[]> {
	return rowsOf<BudgetBalance>((await get<{ data: BudgetBalance[] }>(`${BASE}/learning-budgets`, year ? { year } : undefined)).data)
}

/** One employee's year with its ledger. */
export async function getEmployeeBudget(employeeId: number, year?: number | null): Promise<LearningBudget> {
	return (await get<{ data: LearningBudget }>(`${BASE}/employees/${employeeId}/learning-budget`, year ? { year } : undefined)).data
}

/**
 * Gives `amount` for the year to the listed employees, or to everyone
 * employed today; anyone already allocated that year is skipped. The
 * message says how many it reached.
 */
export async function allocateBudget(year: number, amount: number, employeeIds: number[] | null): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/learning-budgets/allocate`, { year, amount, ...(employeeIds ? { employee_ids: employeeIds } : {}) })
}

/** Signed, never zero, always with the reason. */
export async function adjustBudget(employeeId: number, year: number, amount: number, note: string): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/employees/${employeeId}/learning-budget/adjust`, { year, amount, note })
}

export async function listLearningRequests(filters: { page?: number; status?: LearningRequestStatus | null; employee_id?: number | null } = {}): Promise<Paginated<LearningRequest>> {
	const { page, ...rest } = filters
	return toPaginated(await get<RawPaginatedResponse<LearningRequest>>(`${BASE}/learning-requests`, query(page, rest)))
}

// ── My training (hr/me) ─────────────────────────────────────────────────────

/** Scheduled sessions open to self-enrollment that have not started. */
export async function openSessions(): Promise<TrainingSession[]> {
	return rowsOf<TrainingSession>((await get<{ data: TrainingSession[] }>(`${BASE}/me/training-sessions`)).data)
}

export async function enrollMe(sessionId: number): Promise<Enrollment> {
	return (await post<{ data: Enrollment }>(`${BASE}/me/training-sessions/${sessionId}/enroll`)).data
}

/** Latest first, each with its session and course. */
export async function myEnrollments(): Promise<Enrollment[]> {
	return rowsOf<Enrollment>((await get<{ data: Enrollment[] }>(`${BASE}/me/enrollments`)).data)
}

/** Before the session starts; after, HR cancels it. */
export async function cancelMyEnrollment(id: number): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/me/enrollments/${id}/cancel`)
}

export async function myCertifications(): Promise<Certification[]> {
	return rowsOf<Certification>((await get<{ data: Certification[] }>(`${BASE}/me/certifications`)).data)
}

export async function myBudget(year?: number | null): Promise<LearningBudget> {
	return (await get<{ data: LearningBudget }>(`${BASE}/me/learning-budget`, year ? { year } : undefined)).data
}

export async function myLearningRequests(): Promise<LearningRequest[]> {
	return rowsOf<LearningRequest>((await get<{ data: LearningRequest[] }>(`${BASE}/me/learning-requests`)).data)
}

/** In the budget's currency; the amount must be available now and again at the final approval. */
export async function requestLearning(payload: LearningRequestPayload): Promise<LearningRequest> {
	return (await post<{ data: LearningRequest }>(`${BASE}/me/learning-requests`, payload)).data
}

/** While pending; withdraws its approval request too. */
export async function cancelLearningRequest(id: number): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/me/learning-requests/${id}/cancel`)
}
