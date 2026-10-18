/**
 * HR (`add/hr` package in ADD Core, mounted under `/api/v1/hr`). Shapes taken
 * from the package's API resources (Core/Http/Resources) and the HR folder of
 * ADD-OS.postman_collection.json.
 */

/** A bilingual field: Arabic always, English optional. */
export interface Translatable {
	ar: string
	en?: string | null
}

export type EmployeeStatus = "upcoming" | "probation" | "active" | "suspended" | "terminated"
export type EmploymentType = "full_time" | "part_time"
export type WorkMode = "on_site" | "remote" | "hybrid"
export type ContractType = "open_ended" | "fixed_term" | "hourly" | "internship"

export const EMPLOYEE_STATUSES: readonly EmployeeStatus[] = ["upcoming", "probation", "active", "suspended", "terminated"]
export const EMPLOYMENT_TYPES: readonly EmploymentType[] = ["full_time", "part_time"]
export const WORK_MODES: readonly WorkMode[] = ["on_site", "remote", "hybrid"]
export const CONTRACT_TYPES: readonly ContractType[] = ["open_ended", "fixed_term", "hourly", "internship"]

export interface PersonRef {
	id: number
	employee_number: string
	name: Translatable
}

/** `GET hr/employees` rows, and `employee` on `GET auth/me`. */
export interface EmployeeSummary {
	id: number
	employee_number: string
	name: Translatable
	status: EmployeeStatus
	user_id: number | null
	hired_on: string
	job_title: Translatable | null
	org_unit: { id: number; name: Translatable } | null
}

export interface Assignment {
	id: number
	effective_from: string
	effective_to: string | null
	org_unit: { id: number; name: Translatable } | null
	position: { id: number; title: Translatable } | null
	job_grade: { id: number; code: string; name: Translatable } | null
	manager: PersonRef | null
	work_location: { id: number; name: Translatable } | null
	job_title: Translatable | null
	employment_type: EmploymentType
	work_mode: WorkMode
}

export interface Contract {
	id: number
	type: ContractType
	starts_on: string
	ends_on: string | null
	notice_period_days: number | null
	reference: string | null
}

export interface EmergencyContact {
	id: number
	name: string
	relation: string
	phone: string
}

/** `GET hr/employees/{id}`. */
export interface Employee {
	id: number
	employee_number: string
	user_id: number | null
	name: Translatable
	gender: "male" | "female" | null
	date_of_birth: string | null
	phone: string | null
	personal_email: string | null
	work_email: string | null
	status: EmployeeStatus
	hired_on: string
	probation_ends_on: string | null
	confirmed_on: string | null
	terminated_on: string | null
	current_assignment: Assignment | null
	current_contract: Contract | null
	contacts: EmergencyContact[]
}

export interface EmploymentEvent {
	id: number
	type: string
	effective_on: string
	effective_to: string | null
	reason: string | null
	notes: string | null
	recorded_at: string | null
}

export interface EmployeeDocument {
	id: number
	document_type: { id: number; code: string; name: Translatable }
	original_name: string
	mime: string
	size_bytes: number
	issued_on: string | null
	expires_on: string | null
	uploaded_at: string | null
}

/** A temporary signed link to a document, valid for a few minutes. */
export interface DocumentLink {
	url: string
	expires_at: string
}

export interface OrgUnit {
	id: number
	parent_id: number | null
	code: string
	name: Translatable
	head_employee_id: number | null
	is_active: boolean
	children?: OrgUnit[]
}

export interface Position {
	id: number
	org_unit_id: number
	job_grade_id: number | null
	code: string
	title: Translatable
	headcount: number
	occupied: number
	is_active: boolean
}

export interface JobGrade {
	id: number
	code: string
	name: Translatable
}

/** `GET hr/me`. */
export interface MyProfile {
	id: number
	employee_number: string
	name: Translatable
	phone: string | null
	personal_email: string | null
	work_email: string | null
	status: EmployeeStatus
	hired_on: string
	probation_ends_on: string | null
	confirmed_on: string | null
	current_assignment: Assignment | null
	current_contract: Contract | null
	contacts: EmergencyContact[]
	compliance: {
		complete: boolean
		missing: { code: string; name: Translatable }[]
		expired_count: number
	}
}

/** `GET hr/me/team`. */
export interface TeamMember {
	id: number
	employee_number: string
	name: Translatable
	status: EmployeeStatus
	job_title: Translatable | null
	org_unit: { id: number; name: Translatable } | null
}

/** `POST hr/employees`. ADD creates or links the dashboard account, so it needs a work email and an E.164 phone. */
export interface HireEmployeePayload {
	name: Translatable
	phone: string
	work_email: string
	personal_email?: string | null
	hired_on: string
	contract: { type: ContractType; ends_on?: string | null; probation_ends_on?: string | null }
	assignment: {
		org_unit_id: number
		position_id?: number | null
		job_grade_id?: number | null
		manager_id?: number | null
		employment_type: EmploymentType
		work_mode: WorkMode
	}
}

/** `POST hr/org-units` and `PATCH hr/org-units/{id}`. */
export interface OrgUnitPayload {
	code: string
	name: Translatable
	parent_id: number | null
	is_active?: boolean
}
