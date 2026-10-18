/**
 * HR (`add/hr` in ADD Core) under `/api/v1/hr`: the core module — the
 * organisation, employees, their career, documents, checklists and alerts,
 * and the core of `hr/me`. Every admin route carries its own `hr.*`
 * permission (no role gate), and `hr/me` answers any account with an active
 * employee record. Update endpoints answer `{message}` (translated by the
 * server, shown as is); creates answer the resource; deletes answer 204.
 *
 * Routes, rules and shapes read from ADD Core
 * `packages/add/hr/routes/core/{admin,self}.php`, `src/Core/Http/Requests` and
 * `src/Core/Http/Resources`.
 */

import type { Paginated, RawPaginatedResponse } from "../pagination"
import type {
	Assignment,
	ChecklistTask,
	ChecklistTemplate,
	ChecklistTemplatePayload,
	ContactPayload,
	Contract,
	DependentPayload,
	DocumentCompliance,
	DocumentLink,
	DocumentType,
	DocumentTypePayload,
	Employee,
	EmployeeDocument,
	EmployeeSensitive,
	EmployeeStatus,
	EmployeeSummary,
	EmploymentCertificate,
	EmploymentEvent,
	HireEmployeePayload,
	HrAlert,
	JobGrade,
	JobGradePayload,
	MyEmploymentEvent,
	MyProfile,
	OrgUnit,
	OrgUnitPayload,
	Position,
	PositionPayload,
	RecordEventPayload,
	SalaryCertificate,
	TeamMember,
	UpdateEmployeePayload,
	UploadDocumentPayload,
	WorkLocation,
	WorkLocationPayload
} from "@/add-os/modules/hr/types/hr"
import { del, get, patch, post, put, uploadFile } from "../api"
import { rowsOf, toPaginated } from "../pagination"

const BASE = "/api/v1/hr"

/** What an update answers: the server's own translated confirmation. */
export interface UpdateResult {
	message?: string
}

// ── Employees ───────────────────────────────────────────────────────────────

export interface EmployeeFilters {
	page?: number
	q?: string
	status?: EmployeeStatus | null
	org_unit_id?: number | null
}

export async function listEmployees(filters: EmployeeFilters = {}): Promise<Paginated<EmployeeSummary>> {
	const query: Record<string, unknown> = { page: filters.page ?? 1 }
	if (filters.q) query.q = filters.q
	if (filters.status) query.status = filters.status
	if (filters.org_unit_id) query.org_unit_id = filters.org_unit_id
	return toPaginated(await get<RawPaginatedResponse<EmployeeSummary>>(`${BASE}/employees`, query))
}

export async function getEmployee(id: number): Promise<Employee> {
	return (await get<{ data: Employee }>(`${BASE}/employees/${id}`)).data
}

export async function hireEmployee(payload: HireEmployeePayload): Promise<Employee> {
	return (await post<{ data: Employee }>(`${BASE}/employees`, payload)).data
}

export async function updateEmployee(id: number, payload: UpdateEmployeePayload): Promise<UpdateResult> {
	return patch<UpdateResult>(`${BASE}/employees/${id}`, payload)
}

/** The decrypted national ID and bank account. Every read is audited; callers show it and never keep it. */
export async function getEmployeeSensitive(id: number): Promise<EmployeeSensitive> {
	return (await get<{ data: EmployeeSensitive }>(`${BASE}/employees/${id}/sensitive`)).data
}

/** Replaces the whole list (at most five). */
export async function replaceEmployeeContacts(id: number, contacts: ContactPayload[]): Promise<UpdateResult> {
	return put<UpdateResult>(`${BASE}/employees/${id}/contacts`, { contacts })
}

/** Replaces the whole list (at most twenty). */
export async function replaceEmployeeDependents(id: number, dependents: DependentPayload[]): Promise<UpdateResult> {
	return put<UpdateResult>(`${BASE}/employees/${id}/dependents`, { dependents })
}

// ── Career ──────────────────────────────────────────────────────────────────

export async function listEmploymentEvents(employeeId: number): Promise<EmploymentEvent[]> {
	return rowsOf<EmploymentEvent>((await get<{ data: EmploymentEvent[] }>(`${BASE}/employees/${employeeId}/events`)).data)
}

/** Records one change to the employment; answers the event (201). */
export async function recordEmploymentEvent(employeeId: number, payload: RecordEventPayload): Promise<EmploymentEvent> {
	return (await post<{ data: EmploymentEvent }>(`${BASE}/employees/${employeeId}/events`, payload)).data
}

export async function listEmployeeAssignments(employeeId: number): Promise<Assignment[]> {
	return rowsOf<Assignment>((await get<{ data: Assignment[] }>(`${BASE}/employees/${employeeId}/assignments`)).data)
}

export async function listEmployeeContracts(employeeId: number): Promise<Contract[]> {
	return rowsOf<Contract>((await get<{ data: Contract[] }>(`${BASE}/employees/${employeeId}/contracts`)).data)
}

// ── Documents ───────────────────────────────────────────────────────────────

export interface EmployeeDocuments {
	documents: EmployeeDocument[]
	compliance: DocumentCompliance | null
}

export async function listEmployeeDocuments(employeeId: number): Promise<EmployeeDocuments> {
	const response = await get<{ data: EmployeeDocument[]; compliance?: DocumentCompliance }>(`${BASE}/employees/${employeeId}/documents`)
	return { documents: rowsOf<EmployeeDocument>(response.data), compliance: response.compliance ?? null }
}

/** Multipart: the file goes as `file`, the rest as form fields. */
export async function uploadEmployeeDocument(employeeId: number, payload: UploadDocumentPayload): Promise<EmployeeDocument> {
	const fields: Record<string, string> = { document_type_id: String(payload.document_type_id) }
	if (payload.issued_on) fields.issued_on = payload.issued_on
	if (payload.expires_on) fields.expires_on = payload.expires_on
	if (payload.notes) fields.notes = payload.notes
	return (await uploadFile<{ data: EmployeeDocument }>(`${BASE}/employees/${employeeId}/documents`, payload.file, "file", fields)).data
}

export async function deleteEmployeeDocument(documentId: number): Promise<void> {
	await del<void>(`${BASE}/documents/${documentId}`)
}

/** A signed link to one document, valid for a few minutes; every link is audited. */
export async function documentLink(documentId: number): Promise<DocumentLink> {
	return (await post<{ data: DocumentLink }>(`${BASE}/documents/${documentId}/link`)).data
}

export async function listDocumentTypes(): Promise<DocumentType[]> {
	return rowsOf<DocumentType>((await get<{ data: DocumentType[] }>(`${BASE}/document-types`)).data)
}

export async function createDocumentType(payload: DocumentTypePayload): Promise<DocumentType> {
	return (await post<{ data: DocumentType }>(`${BASE}/document-types`, payload)).data
}

export async function updateDocumentType(id: number, payload: Partial<DocumentTypePayload>): Promise<UpdateResult> {
	return patch<UpdateResult>(`${BASE}/document-types/${id}`, payload)
}

/** 409 once documents of the type are on file — deactivate it instead. */
export async function deleteDocumentType(id: number): Promise<UpdateResult> {
	await del<void>(`${BASE}/document-types/${id}`)
	return {}
}

// ── Checklists ──────────────────────────────────────────────────────────────

export async function listChecklistTemplates(): Promise<ChecklistTemplate[]> {
	return rowsOf<ChecklistTemplate>((await get<{ data: ChecklistTemplate[] }>(`${BASE}/checklist-templates`)).data)
}

export async function createChecklistTemplate(payload: ChecklistTemplatePayload): Promise<ChecklistTemplate> {
	return (await post<{ data: ChecklistTemplate }>(`${BASE}/checklist-templates`, payload)).data
}

export async function updateChecklistTemplate(id: number, payload: Partial<ChecklistTemplatePayload>): Promise<UpdateResult> {
	return patch<UpdateResult>(`${BASE}/checklist-templates/${id}`, payload)
}

export async function deleteChecklistTemplate(id: number): Promise<void> {
	await del<void>(`${BASE}/checklist-templates/${id}`)
}

export async function listEmployeeChecklist(employeeId: number): Promise<ChecklistTask[]> {
	return rowsOf<ChecklistTask>((await get<{ data: ChecklistTask[] }>(`${BASE}/employees/${employeeId}/checklist`)).data)
}

/** Ticking keeps the first completion's time and author; unticking clears both. */
export async function updateChecklistTask(taskId: number, payload: { completed: boolean; notes?: string | null }): Promise<UpdateResult> {
	return patch<UpdateResult>(`${BASE}/checklist-tasks/${taskId}`, payload)
}

// ── Alerts ──────────────────────────────────────────────────────────────────

/** Everything HR must decide soon, soonest first. Not paginated, and the server takes no filter. */
export async function listHrAlerts(): Promise<HrAlert[]> {
	return rowsOf<HrAlert>((await get<{ data: HrAlert[] }>(`${BASE}/alerts`)).data)
}

// ── Organisation ────────────────────────────────────────────────────────────

/** The whole structure, nested through `children`. */
export async function orgTree(): Promise<OrgUnit[]> {
	return rowsOf<OrgUnit>((await get<{ data: OrgUnit[] }>(`${BASE}/org-units`, { tree: 1 })).data)
}

export async function listOrgUnits(): Promise<OrgUnit[]> {
	return rowsOf<OrgUnit>((await get<{ data: OrgUnit[] }>(`${BASE}/org-units`)).data)
}

export async function createOrgUnit(payload: OrgUnitPayload): Promise<OrgUnit> {
	return (await post<{ data: OrgUnit }>(`${BASE}/org-units`, payload)).data
}

export async function updateOrgUnit(id: number, payload: Partial<OrgUnitPayload>): Promise<UpdateResult> {
	return patch<UpdateResult>(`${BASE}/org-units/${id}`, payload)
}

/** 409 while the unit has sub-units, positions or anyone ever assigned to it. */
export async function deleteOrgUnit(id: number): Promise<void> {
	await del<void>(`${BASE}/org-units/${id}`)
}

export async function listPositions(orgUnitId?: number | null): Promise<Position[]> {
	const query = orgUnitId ? { org_unit_id: orgUnitId } : undefined
	return rowsOf<Position>((await get<{ data: Position[] }>(`${BASE}/positions`, query)).data)
}

export async function createPosition(payload: PositionPayload): Promise<Position> {
	return (await post<{ data: Position }>(`${BASE}/positions`, payload)).data
}

export async function updatePosition(id: number, payload: Partial<PositionPayload>): Promise<UpdateResult> {
	return patch<UpdateResult>(`${BASE}/positions/${id}`, payload)
}

/** 409 once anyone has held the position: it stays in their job history. */
export async function deletePosition(id: number): Promise<void> {
	await del<void>(`${BASE}/positions/${id}`)
}

/** Ordered by rank. */
export async function listJobGrades(): Promise<JobGrade[]> {
	return rowsOf<JobGrade>((await get<{ data: JobGrade[] }>(`${BASE}/job-grades`)).data)
}

export async function createJobGrade(payload: JobGradePayload): Promise<JobGrade> {
	return (await post<{ data: JobGrade }>(`${BASE}/job-grades`, payload)).data
}

export async function updateJobGrade(id: number, payload: Partial<JobGradePayload>): Promise<UpdateResult> {
	return patch<UpdateResult>(`${BASE}/job-grades/${id}`, payload)
}

export async function deleteJobGrade(id: number): Promise<UpdateResult> {
	await del<void>(`${BASE}/job-grades/${id}`)
	return {}
}

export async function listWorkLocations(): Promise<WorkLocation[]> {
	return rowsOf<WorkLocation>((await get<{ data: WorkLocation[] }>(`${BASE}/work-locations`)).data)
}

export async function createWorkLocation(payload: WorkLocationPayload): Promise<WorkLocation> {
	return (await post<{ data: WorkLocation }>(`${BASE}/work-locations`, payload)).data
}

export async function updateWorkLocation(id: number, payload: Partial<WorkLocationPayload>): Promise<UpdateResult> {
	return patch<UpdateResult>(`${BASE}/work-locations/${id}`, payload)
}

export async function deleteWorkLocation(id: number): Promise<UpdateResult> {
	await del<void>(`${BASE}/work-locations/${id}`)
	return {}
}

// ── My HR (hr/me) ────────────────────────────────────────────────────────────

export async function getMyProfile(): Promise<MyProfile> {
	return (await get<{ data: MyProfile }>(`${BASE}/me`)).data
}

export async function listMyEvents(): Promise<MyEmploymentEvent[]> {
	return rowsOf<MyEmploymentEvent>((await get<{ data: MyEmploymentEvent[] }>(`${BASE}/me/events`)).data)
}

export async function listMyDocuments(): Promise<EmployeeDocument[]> {
	return rowsOf<EmployeeDocument>((await get<{ data: EmployeeDocument[] }>(`${BASE}/me/documents`)).data)
}

export async function myDocumentLink(documentId: number): Promise<DocumentLink> {
	return (await post<{ data: DocumentLink }>(`${BASE}/me/documents/${documentId}/link`)).data
}

export async function replaceMyContacts(contacts: ContactPayload[]): Promise<UpdateResult> {
	return put<UpdateResult>(`${BASE}/me/contacts`, { contacts })
}

export async function listMyTeam(): Promise<TeamMember[]> {
	return rowsOf<TeamMember>((await get<{ data: TeamMember[] }>(`${BASE}/me/team`)).data)
}

/** Served by the payroll module's self routes; every one generated is audited. */
export async function getMyEmploymentCertificate(): Promise<EmploymentCertificate> {
	return (await get<{ data: EmploymentCertificate }>(`${BASE}/me/certificates/employment`)).data
}

export async function getMySalaryCertificate(): Promise<SalaryCertificate> {
	return (await get<{ data: SalaryCertificate }>(`${BASE}/me/certificates/salary`)).data
}
