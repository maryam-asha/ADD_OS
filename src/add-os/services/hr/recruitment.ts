/**
 * HR recruitment under `/api/v1/hr`. Reading needs hr.recruitment.view,
 * every change hr.recruitment.manage; hiring a candidate creates an
 * employee, so it also needs hr.employees.create. Requisitions and offers
 * are decided through the approval engine. `hr/me/*` is the employee's
 * side: open jobs and their applications, the requisitions they file as a
 * hiring manager, and the interviews they score.
 *
 * Routes, rules and shapes read from ADD Core
 * `packages/add/hr/routes/recruitment/{admin,self}.php` and
 * `src/Recruitment/Http`.
 */

import type { Paginated, RawPaginatedResponse } from "../pagination"
import type { UpdateResult } from "./core"
import type { Employee } from "@/add-os/modules/hr/types/hr"
import type {
	Application,
	Candidate,
	HireCandidatePayload,
	Interview,
	InterviewPayload,
	JobOpening,
	JobOpeningPayload,
	MyApplication,
	MyInterview,
	NewApplicationPayload,
	Offer,
	OfferPayload,
	OpeningStatus,
	PipelineStage,
	PublicJobOpening,
	Requisition,
	RequisitionPayload,
	RequisitionStatus,
	ScorecardPayload
} from "@/add-os/modules/hr/types/recruitment"
import { del, get, patch, post, put, uploadFile } from "../api"
import { rowsOf, toPaginated } from "../pagination"

const BASE = "/api/v1/hr"

/** Only the filters that are set, with the page. */
function query(page: number | undefined, filters: Record<string, unknown>): Record<string, unknown> {
	const q: Record<string, unknown> = { page: page ?? 1 }
	for (const [key, value] of Object.entries(filters)) {
		if (value !== null && value !== undefined && value !== "") q[key] = value
	}
	return q
}

/**
 * A form with an optional CV: multipart when there is a file (uploadFile
 * takes string fields), plain JSON when there is none.
 */
async function withCv<T>(path: string, cv: File | null | undefined, fields: Record<string, string | number | null | undefined>): Promise<T> {
	if (!cv) return post<T>(path, Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== null && v !== undefined && v !== "")))
	const strings: Record<string, string> = {}
	for (const [key, value] of Object.entries(fields)) {
		if (value !== null && value !== undefined && value !== "") strings[key] = String(value)
	}
	return uploadFile<T>(path, cv, "cv", strings)
}

// ── Pipeline stages ─────────────────────────────────────────────────────────

export async function listStages(): Promise<PipelineStage[]> {
	return rowsOf<PipelineStage>((await get<{ data: PipelineStage[] }>(`${BASE}/pipeline-stages`)).data)
}

/** A new open stage; its `sort` (1–79) places it among the others. */
export async function createStage(payload: { code: string; name: PipelineStage["name"]; sort: number }): Promise<PipelineStage> {
	return (await post<{ data: PipelineStage }>(`${BASE}/pipeline-stages`, payload)).data
}

/** Open stages only; the fixed ones refuse. */
export async function updateStage(id: number, payload: Partial<{ name: PipelineStage["name"]; sort: number; is_active: boolean }>): Promise<UpdateResult> {
	return patch<UpdateResult>(`${BASE}/pipeline-stages/${id}`, payload)
}

// ── Requisitions ────────────────────────────────────────────────────────────

export async function listRequisitions(filters: { page?: number; status?: RequisitionStatus | null; org_unit_id?: number | null } = {}): Promise<Paginated<Requisition>> {
	const { page, ...rest } = filters
	return toPaginated(await get<RawPaginatedResponse<Requisition>>(`${BASE}/requisitions`, query(page, rest)))
}

export async function getRequisition(id: number): Promise<Requisition> {
	return (await get<{ data: Requisition }>(`${BASE}/requisitions/${id}`)).data
}

/** Filed for a hiring manager; it goes for approval. */
export async function createRequisition(payload: RequisitionPayload): Promise<Requisition> {
	return (await post<{ data: Requisition }>(`${BASE}/requisitions`, payload)).data
}

/** While pending, or approved with nobody hired yet. */
export async function cancelRequisition(id: number): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/requisitions/${id}/cancel`)
}

/** An approved one stops hiring, whoever is hired so far. */
export async function closeRequisition(id: number): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/requisitions/${id}/close`)
}

// ── Job openings ────────────────────────────────────────────────────────────

export async function listOpenings(filters: { page?: number; status?: OpeningStatus | null; requisition_id?: number | null } = {}): Promise<Paginated<JobOpening>> {
	const { page, ...rest } = filters
	return toPaginated(await get<RawPaginatedResponse<JobOpening>>(`${BASE}/job-openings`, query(page, rest)))
}

export async function getOpening(id: number): Promise<JobOpening> {
	return (await get<{ data: JobOpening }>(`${BASE}/job-openings/${id}`)).data
}

/** An opening for an approved requisition; `open` publishes it at once. */
export async function createOpening(requisitionId: number, payload: JobOpeningPayload): Promise<JobOpening> {
	return (await post<{ data: JobOpening }>(`${BASE}/requisitions/${requisitionId}/job-openings`, payload)).data
}

export async function updateOpening(id: number, payload: Partial<JobOpeningPayload>): Promise<UpdateResult> {
	return patch<UpdateResult>(`${BASE}/job-openings/${id}`, payload)
}

export async function openOpening(id: number): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/job-openings/${id}/open`)
}

export async function closeOpening(id: number): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/job-openings/${id}/close`)
}

// ── Candidates ──────────────────────────────────────────────────────────────

export async function listCandidates(filters: { page?: number; search?: string | null } = {}): Promise<Paginated<Candidate>> {
	const { page, ...rest } = filters
	return toPaginated(await get<RawPaginatedResponse<Candidate>>(`${BASE}/candidates`, query(page, rest)))
}

/** A candidate with every application they made. */
export async function getCandidate(id: number): Promise<Candidate> {
	return (await get<{ data: Candidate }>(`${BASE}/candidates/${id}`)).data
}

export async function updateCandidate(id: number, payload: Partial<Pick<Candidate, "name" | "email" | "phone" | "notes">>): Promise<UpdateResult> {
	return patch<UpdateResult>(`${BASE}/candidates/${id}`, payload)
}

/** Erases the candidate and everything about them, CVs included — a request to be forgotten. */
export async function eraseCandidate(id: number): Promise<UpdateResult> {
	await del<void>(`${BASE}/candidates/${id}`)
	return {}
}

// ── Applications ────────────────────────────────────────────────────────────

export async function listApplications(filters: { page?: number; job_opening_id?: number | null; stage?: string | null } = {}): Promise<Paginated<Application>> {
	const { page, ...rest } = filters
	return toPaginated(await get<RawPaginatedResponse<Application>>(`${BASE}/applications`, query(page, rest)))
}

/** An application with its candidate, history, interviews (and their scorecards) and offers. */
export async function getApplication(id: number): Promise<Application> {
	return (await get<{ data: Application }>(`${BASE}/applications/${id}`)).data
}

/** HR enters an application: an existing candidate by id, or a new person by name. */
export async function addApplication(openingId: number, payload: NewApplicationPayload): Promise<Application> {
	const { cv, ...fields } = payload
	return (await withCv<{ data: Application }>(`${BASE}/job-openings/${openingId}/applications`, cv, fields)).data
}

/** To an active open stage; offer, hired, rejected and withdrawn have their own actions. */
export async function moveApplication(id: number, stage: string, note: string | null): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/applications/${id}/move`, { stage, note })
}

export async function rejectApplication(id: number, reason: string | null): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/applications/${id}/reject`, { reason })
}

export async function withdrawApplication(id: number, reason: string | null): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/applications/${id}/withdraw`, { reason })
}

/** A link to the CV that works for a few minutes; every one is audited. */
export async function cvLink(id: number): Promise<{ url: string; expires_at: string }> {
	return (await post<{ data: { url: string; expires_at: string } }>(`${BASE}/applications/${id}/cv-link`)).data
}

/**
 * Makes the candidate an employee from their accepted offer: the
 * requisition gives the unit, position, grade, manager and employment type,
 * the offer the start date and pay; what is sent here overrides them.
 */
export async function hireCandidate(id: number, payload: HireCandidatePayload): Promise<Employee> {
	return (await post<{ data: Employee }>(`${BASE}/applications/${id}/hire`, payload)).data
}

// ── Interviews ──────────────────────────────────────────────────────────────

export async function scheduleInterview(applicationId: number, payload: InterviewPayload): Promise<Interview> {
	return (await post<{ data: Interview }>(`${BASE}/applications/${applicationId}/interviews`, payload)).data
}

export async function completeInterview(id: number): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/interviews/${id}/complete`)
}

export async function cancelInterview(id: number): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/interviews/${id}/cancel`)
}

// ── Offers ──────────────────────────────────────────────────────────────────

/** Moves the application to the offer stage; the offer goes for approval before it is made. */
export async function makeOffer(applicationId: number, payload: OfferPayload): Promise<Offer> {
	return (await post<{ data: Offer }>(`${BASE}/applications/${applicationId}/offers`, payload)).data
}

/** The candidate's answer to an approved offer, recorded by HR. */
export async function acceptOffer(id: number): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/offers/${id}/accept`)
}

export async function declineOffer(id: number, note: string | null): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/offers/${id}/decline`, { note })
}

export async function withdrawOffer(id: number): Promise<UpdateResult> {
	return post<UpdateResult>(`${BASE}/offers/${id}/withdraw`)
}

// ── My recruitment (hr/me) ──────────────────────────────────────────────────

/** Openings taking applications now. */
export async function myOpenings(): Promise<PublicJobOpening[]> {
	return rowsOf<PublicJobOpening>((await get<{ data: PublicJobOpening[] }>(`${BASE}/me/job-openings`)).data)
}

export async function applyInternally(openingId: number, coverLetter: string | null, cv: File | null): Promise<{ id: number; stage: string }> {
	return (await withCv<{ data: { id: number; stage: string } }>(`${BASE}/me/job-openings/${openingId}/apply`, cv, { cover_letter: coverLetter })).data
}

export async function myApplications(): Promise<MyApplication[]> {
	return rowsOf<MyApplication>((await get<{ data: MyApplication[] }>(`${BASE}/me/applications`)).data)
}

/** The requisitions I am the hiring manager of. */
export async function myRequisitions(): Promise<Requisition[]> {
	return rowsOf<Requisition>((await get<{ data: Requisition[] }>(`${BASE}/me/requisitions`)).data)
}

/** Filed by me, as its hiring manager. */
export async function fileMyRequisition(payload: Omit<RequisitionPayload, "hiring_manager_id">): Promise<Requisition> {
	return (await post<{ data: Requisition }>(`${BASE}/me/requisitions`, payload)).data
}

/** The interviews I am an interviewer on, with my own scorecard. */
export async function myInterviews(): Promise<MyInterview[]> {
	return rowsOf<MyInterview>((await get<{ data: MyInterview[] }>(`${BASE}/me/interviews`)).data)
}

export async function saveScorecard(interviewId: number, payload: ScorecardPayload): Promise<UpdateResult> {
	return put<UpdateResult>(`${BASE}/me/interviews/${interviewId}/scorecard`, payload)
}
