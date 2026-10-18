/**
 * HR time and attendance (`add/hr` Time module). Shapes read from ADD Core
 * `packages/add/hr/src/Time/Http/Resources`, its Form Requests, and the
 * controllers that build their answers inline (RosterController,
 * AttendanceCardController, MyAttendanceController). Instants are ISO 8601
 * in the organisation's own time zone (LocalTime::iso); shift times are
 * wall-clock `HH:mm`.
 */
import type { Translatable } from "@/add-os/modules/hr/types/hr"

export type DayKind = "shift" | "flexible" | "unscheduled" | "rest" | "holiday" | "leave" | "not_employed"
export type DayStatus = "present" | "incomplete" | "no_record" | "absent" | "excused" | "rest" | "holiday" | "leave" | "open"
export type EntryStatus = "verified" | "pending" | "approved" | "rejected" | "cancelled"
export type ExceptionType = "missing_out" | "no_record" | "late" | "early_leave" | "unscheduled_work"
export type ExceptionStatus = "open" | "resolved"
export type ExceptionResolution = "excused" | "absent" | "dismissed" | "corrected"
export type OvertimeKind = "pre" | "post"
export type OvertimeStatus = "pending" | "approved" | "rejected" | "cancelled"
export type PeriodStatus = "open" | "locked"
export type PunchSource = "card_scan" | "manual_entry" | "manual"
export type WorkPatternKind = "fixed" | "roster" | "flexible"

export const DAY_STATUSES: readonly DayStatus[] = ["present", "incomplete", "no_record", "absent", "excused", "rest", "holiday", "leave", "open"]
export const EXCEPTION_TYPES: readonly ExceptionType[] = ["missing_out", "no_record", "late", "early_leave", "unscheduled_work"]
export const EXCEPTION_RESOLUTIONS: readonly ExceptionResolution[] = ["excused", "absent", "dismissed", "corrected"]
export const WORK_PATTERN_KINDS: readonly WorkPatternKind[] = ["fixed", "roster", "flexible"]
/** ISO weekdays, as WorkPattern::$weekly keys them: 1 Monday … 7 Sunday. */
export const ISO_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const

export interface ShiftTemplate {
	id: number
	code: string
	name: Translatable
	starts_at: string
	ends_at: string
	crosses_midnight: boolean
	break_minutes: number
	planned_minutes: number
	is_active: boolean
}

export interface ShiftTemplatePayload {
	code: string
	name: Translatable
	starts_at: string
	ends_at: string
	break_minutes: number
	is_active: boolean
}

export interface WorkPattern {
	id: number
	code: string
	name: Translatable
	kind: WorkPatternKind
	/** Fixed patterns: shift template id per ISO weekday ("1".."7"); a missing or null day is a rest day. */
	weekly: Record<string, number | null> | null
	/** Flexible patterns. */
	weekly_hours: number | null
	is_active: boolean
}

export interface WorkPatternPayload {
	code: string
	name: Translatable
	kind: WorkPatternKind
	weekly: Record<string, number | null> | null
	weekly_hours: number | null
	is_active: boolean
}

export interface AttendancePolicy {
	id: number
	effective_from: string
	effective_to: string | null
	grace_minutes: number
	early_leave_grace_minutes: number
	min_overtime_minutes: number
	overtime_requires_pre_approval: boolean
	entry_tolerance_minutes: number
}

export type AttendancePolicyPayload = Omit<AttendancePolicy, "id">

export interface RosterDay {
	date: string
	kind: DayKind
	shift_template_id: number | null
	/** Set by hand on the roster, rather than coming from the work pattern. */
	rostered: boolean
}

export interface RosterRow {
	employee: { id: number; employee_number: string; name: Translatable }
	days: RosterDay[]
}

/** One change to the roster: a shift (or a day off, `shift_template_id: null`), or back to the pattern (`remove`). */
export interface RosterChange {
	employee_id: number
	work_date: string
	shift_template_id?: number | null
	remove?: boolean
	note?: string | null
}

export interface AttendanceException {
	id: number
	attendance_day_id: number
	employee?: { id: number; name: Translatable }
	work_date: string
	type: ExceptionType
	status: ExceptionStatus
	resolution: ExceptionResolution | null
	note: string | null
	resolved_by: number | null
	resolved_at: string | null
}

export interface AttendanceDay {
	id: number
	employee?: { id: number; employee_number: string; name: Translatable }
	work_date: string
	status: DayStatus
	shift?: { id: number; name: Translatable; starts_at: string; ends_at: string } | null
	scheduled_start: string | null
	scheduled_end: string | null
	first_in: string | null
	last_out: string | null
	punch_count: number
	worked_minutes: number
	late_minutes: number
	early_leave_minutes: number
	overtime_minutes: number
	exceptions?: AttendanceException[]
}

export interface AttendanceEntry {
	id: number
	employee?: { id: number; name: Translatable }
	work_date: string
	check_in_at: string | null
	check_out_at: string | null
	note: string | null
	status: EntryStatus
	approval_request_id: number | null
	created_at: string | null
}

export interface OvertimeRequest {
	id: number
	employee?: { id: number; name: Translatable }
	work_date: string
	minutes: number
	kind: OvertimeKind
	reason: string | null
	status: OvertimeStatus
	approval_request_id: number | null
	created_at: string | null
}

export interface Punch {
	id: number
	employee_id: number
	punched_at: string
	source: PunchSource
	device_type: string | null
	device_id: string | null
	reason: string | null
	recorded_by: number | null
}

export interface TimePeriod {
	year: number
	month: number
	status: PeriodStatus
	locked_at: string | null
	locked_by: number | null
}

export interface AttendanceCardStatus {
	has_card: boolean
	issued_at: string | null
}

/** `GET me/schedule`. */
export interface MyScheduleDay {
	date: string
	kind: DayKind
	shift: { id: number; name: Translatable; starts_at: string | null; ends_at: string | null } | null
}

/** `GET me/team/attendance`: one day of each direct report. */
export interface TeamAttendance {
	employee: { id: number; name: Translatable }
	plan: DayKind
	status: DayStatus | null
	first_in: string | null
	last_out: string | null
	late_minutes: number | null
}

/** The range the attendance lists take: two months at most (RangeRequest). */
export interface AttendanceRange {
	from: string
	to: string
	employee_id?: number | null
	org_unit_id?: number | null
	status?: string | null
	type?: string | null
	page?: number
}
