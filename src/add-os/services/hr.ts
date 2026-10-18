/**
 * HR (`add/hr` in ADD Core) under `/api/v1/hr`. Every admin route carries its
 * own `hr.*` permission (no role gate), and `hr/me` answers any account with
 * an active employee record. Update endpoints answer `{message}`; creates
 * answer the resource.
 */

import type { Paginated, RawPaginatedResponse } from "./pagination"
import type {
	DocumentLink,
	Employee,
	EmployeeDocument,
	EmployeeStatus,
	EmployeeSummary,
	EmploymentEvent,
	HireEmployeePayload,
	JobGrade,
	MyProfile,
	OrgUnit,
	OrgUnitPayload,
	Position,
	TeamMember
} from "@/add-os/modules/hr/types/hr"
import { get, patch, post } from "./api"
import { rowsOf, toPaginated } from "./pagination"

const BASE = "/api/v1/hr"

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

export async function listEmploymentEvents(employeeId: number): Promise<EmploymentEvent[]> {
	return rowsOf<EmploymentEvent>((await get<{ data: EmploymentEvent[] }>(`${BASE}/employees/${employeeId}/events`)).data)
}

export async function listEmployeeDocuments(employeeId: number): Promise<EmployeeDocument[]> {
	return rowsOf<EmployeeDocument>((await get<{ data: EmployeeDocument[] }>(`${BASE}/employees/${employeeId}/documents`)).data)
}

/** A signed link to one document, valid for a few minutes; every link is audited. */
export async function documentLink(documentId: number): Promise<DocumentLink> {
	return (await post<{ data: DocumentLink }>(`${BASE}/documents/${documentId}/link`)).data
}

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

export async function updateOrgUnit(id: number, payload: Partial<OrgUnitPayload>): Promise<void> {
	return patch<void>(`${BASE}/org-units/${id}`, payload)
}

export async function listPositions(orgUnitId?: number | null): Promise<Position[]> {
	const query = orgUnitId ? { org_unit_id: orgUnitId } : undefined
	return rowsOf<Position>((await get<{ data: Position[] }>(`${BASE}/positions`, query)).data)
}

export async function listJobGrades(): Promise<JobGrade[]> {
	return rowsOf<JobGrade>((await get<{ data: JobGrade[] }>(`${BASE}/job-grades`)).data)
}

// ── My HR (hr/me) ────────────────────────────────────────────────────────────

export async function getMyProfile(): Promise<MyProfile> {
	return (await get<{ data: MyProfile }>(`${BASE}/me`)).data
}

export async function listMyDocuments(): Promise<EmployeeDocument[]> {
	return rowsOf<EmployeeDocument>((await get<{ data: EmployeeDocument[] }>(`${BASE}/me/documents`)).data)
}

export async function myDocumentLink(documentId: number): Promise<DocumentLink> {
	return (await post<{ data: DocumentLink }>(`${BASE}/me/documents/${documentId}/link`)).data
}

export async function listMyTeam(): Promise<TeamMember[]> {
	return rowsOf<TeamMember>((await get<{ data: TeamMember[] }>(`${BASE}/me/team`)).data)
}
