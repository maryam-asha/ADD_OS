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
export type Gender = "male" | "female"
export type MaritalStatus = "single" | "married" | "divorced" | "widowed"
export type TerminationReason = "resignation" | "dismissal" | "end_of_contract" | "retirement" | "death" | "other"
/** Events an admin records; `hire` comes from hiring and `compensation_change` from payroll. */
export type RecordableEventType =
	| "confirmation"
	| "promotion"
	| "transfer"
	| "assignment_change"
	| "contract_renewal"
	| "suspension"
	| "reinstatement"
	| "termination"
	| "rehire"
export type EmploymentEventType = RecordableEventType | "hire" | "compensation_change"
export type ChecklistKind = "onboarding" | "offboarding"
export type AlertType =
	| "contract_ending"
	| "probation_ending"
	| "document_expiring"
	| "document_expired"
	| "document_missing"
	| "certification_expiring"
	| "certification_expired"

export const EMPLOYEE_STATUSES: readonly EmployeeStatus[] = ["upcoming", "probation", "active", "suspended", "terminated"]
export const EMPLOYMENT_TYPES: readonly EmploymentType[] = ["full_time", "part_time"]
export const WORK_MODES: readonly WorkMode[] = ["on_site", "remote", "hybrid"]
export const CONTRACT_TYPES: readonly ContractType[] = ["open_ended", "fixed_term", "hourly", "internship"]
export const GENDERS: readonly Gender[] = ["male", "female"]
export const MARITAL_STATUSES: readonly MaritalStatus[] = ["single", "married", "divorced", "widowed"]
export const TERMINATION_REASONS: readonly TerminationReason[] = ["resignation", "dismissal", "end_of_contract", "retirement", "death", "other"]
export const RECORDABLE_EVENT_TYPES: readonly RecordableEventType[] = [
	"confirmation",
	"promotion",
	"transfer",
	"assignment_change",
	"contract_renewal",
	"suspension",
	"reinstatement",
	"termination",
	"rehire"
]
export const CHECKLIST_KINDS: readonly ChecklistKind[] = ["onboarding", "offboarding"]
export const ALERT_TYPES: readonly AlertType[] = [
	"contract_ending",
	"probation_ending",
	"document_expiring",
	"document_expired",
	"document_missing",
	"certification_expiring",
	"certification_expired"
]

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
	work_pattern_id: number | null
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

export interface Dependent {
	id: number
	name: string
	relation: string
	date_of_birth: string | null
}

/** `GET hr/employees/{id}`. */
export interface Employee {
	id: number
	employee_number: string
	user_id: number | null
	name: Translatable
	gender: Gender | null
	date_of_birth: string | null
	/** ISO 3166-1 alpha-2. */
	nationality: string | null
	marital_status: MaritalStatus | null
	phone: string | null
	personal_email: string | null
	work_email: string | null
	address: string | null
	/** The values themselves come only from `GET employees/{id}/sensitive`. */
	has_national_id: boolean
	has_bank_account: boolean
	status: EmployeeStatus
	hired_on: string
	probation_ends_on: string | null
	confirmed_on: string | null
	terminated_on: string | null
	termination_reason: TerminationReason | null
	current_assignment: Assignment | null
	current_contract: Contract | null
	contacts: EmergencyContact[]
	dependents: Dependent[]
}

export interface EmploymentEvent {
	id: number
	type: EmploymentEventType
	effective_on: string
	effective_to: string | null
	reason: string | null
	notes: string | null
	payload: Record<string, unknown> | null
	recorded_by: number | null
	recorded_at: string | null
}

/** `GET hr/me/events`: the same history without the notes and who recorded it. */
export interface MyEmploymentEvent {
	id: number
	type: EmploymentEventType
	effective_on: string
	effective_to: string | null
	reason: string | null
}

export interface EmployeeDocument {
	id: number
	document_type: { id: number; code: string; name: Translatable }
	original_name: string
	mime: string
	size_bytes: number
	issued_on: string | null
	expires_on: string | null
	notes: string | null
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
	code: string | null
	name: Translatable
	head_employee_id: number | null
	is_active: boolean
	children?: OrgUnit[]
}

export interface Position {
	id: number
	org_unit_id: number
	job_grade_id: number | null
	code: string | null
	title: Translatable
	headcount: number
	occupied: number
	is_active: boolean
}

export interface JobGrade {
	id: number
	code: string
	name: Translatable
	rank: number
}

/** `GET hr/me`. */
export interface MyProfile {
	id: number
	employee_number: string
	name: Translatable
	gender: Gender | null
	date_of_birth: string | null
	phone: string | null
	personal_email: string | null
	work_email: string | null
	address: string | null
	status: EmployeeStatus
	hired_on: string
	probation_ends_on: string | null
	confirmed_on: string | null
	terminated_on: string | null
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
		work_location_id?: number | null
		employment_type: EmploymentType
		work_mode: WorkMode
	}
}

/** `POST hr/org-units` and `PATCH hr/org-units/{id}`. */
export interface OrgUnitPayload {
	code: string | null
	name: Translatable
	parent_id: number | null
	is_active?: boolean
}

export interface WorkLocation {
	id: number
	name: Translatable
	address: string | null
	is_active: boolean
}

/** `POST|PATCH hr/positions`. */
export interface PositionPayload {
	title: Translatable
	org_unit_id: number
	job_grade_id: number | null
	code: string | null
	headcount: number
	is_active: boolean
}

/** `POST|PATCH hr/job-grades`. */
export interface JobGradePayload {
	name: Translatable
	code: string
	rank: number
}

/** `POST|PATCH hr/work-locations`. */
export interface WorkLocationPayload {
	name: Translatable
	address: string | null
	is_active: boolean
}

/** `GET hr/employees/{id}/sensitive`: decrypted, audited on every read, never kept. */
export interface EmployeeSensitive {
	national_id: string | null
	bank_account: string | null
}

/** `PATCH hr/employees/{id}`: every field optional; `name.ar` is required when `name` is sent. */
export interface UpdateEmployeePayload {
	name?: Translatable
	gender?: Gender | null
	date_of_birth?: string | null
	nationality?: string | null
	marital_status?: MaritalStatus | null
	phone?: string | null
	personal_email?: string | null
	work_email?: string | null
	address?: string | null
	national_id?: string | null
	bank_account?: string | null
}

export interface ContactPayload {
	name: string
	relation: string
	phone: string
}

export interface DependentPayload {
	name: string
	relation: string
	date_of_birth: string | null
}

/** The assignment block of an event: only what changes, except on a rehire. */
export interface EventAssignmentPayload {
	org_unit_id?: number | null
	position_id?: number | null
	job_grade_id?: number | null
	manager_id?: number | null
	work_location_id?: number | null
	job_title?: Translatable | null
	employment_type?: EmploymentType
	work_mode?: WorkMode
}

/** `POST hr/employees/{id}/events` (RecordEmploymentEventRequest). */
export interface RecordEventPayload {
	type: RecordableEventType
	effective_on: string
	effective_to?: string | null
	/** A TerminationReason on a termination, free text up to 32 characters otherwise. */
	reason?: string | null
	notes?: string | null
	contract?: {
		type: ContractType
		ends_on?: string | null
		probation_ends_on?: string | null
		notice_period_days?: number | null
		reference?: string | null
	}
	assignment?: EventAssignmentPayload
}

export interface DocumentType {
	id: number
	code: string
	name: Translatable
	is_required: boolean
	/** The contract types the document is required for; null means every one. */
	contract_types: ContractType[] | null
	has_expiry: boolean
	is_active: boolean
}

export interface DocumentTypePayload {
	name: Translatable
	code: string
	is_required: boolean
	contract_types: ContractType[] | null
	has_expiry: boolean
	is_active: boolean
}

/** `compliance` beside `data` on `GET hr/employees/{id}/documents`. */
export interface DocumentCompliance {
	complete: boolean
	missing: DocumentType[]
	/** Ids of the expired documents in `data`. */
	expired: number[]
}

export interface UploadDocumentPayload {
	document_type_id: number
	file: File
	issued_on: string | null
	expires_on: string | null
	notes: string | null
}

export interface ChecklistTemplateItem {
	title: Translatable
	/** Days from the hire date (onboarding) or the last working day (offboarding); negative is before it. */
	due_offset_days: number
}

export interface ChecklistTemplate {
	id: number
	kind: ChecklistKind
	name: Translatable
	items: ChecklistTemplateItem[]
	is_active: boolean
}

export interface ChecklistTemplatePayload {
	kind: ChecklistKind
	name: Translatable
	items: ChecklistTemplateItem[]
	is_active: boolean
}

export interface ChecklistTask {
	id: number
	kind: ChecklistKind
	event_id: number | null
	title: Translatable
	due_on: string | null
	completed_at: string | null
	/** A user id, not an employee. */
	completed_by: number | null
	notes: string | null
}

/** `GET hr/alerts`: computed on read for everyone employed today. */
export interface HrAlert {
	type: AlertType
	employee: { id: number; employee_number: string | null; name: Translatable }
	due_on: string
	/** Negative once the date has passed. */
	days_left: number
	/** `contract_id`, `document_id`, `document_type` (a code) or `certification_id`, by type. */
	meta: Record<string, string | number>
}

/** `GET hr/me/certificates/employment`. */
export interface EmploymentCertificate {
	employee_number: string
	name: Translatable
	hired_on: string
	job_title: Translatable | null
	org_unit: Translatable | null
	contract_type: ContractType | null
	status: EmployeeStatus
	generated_at: string
}

/** `GET hr/me/certificates/salary`: amounts are decimal strings. */
export interface SalaryCertificate extends EmploymentCertificate {
	monthly_pay: { code: string; name: Translatable; amount: string; currency: string }[]
	last_payslip: { period: string; gross: string; net: string; currency: string } | null
}
