import type { DataTableColumns } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { Bilingual, FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { AttendancePolicy, ShiftTemplate } from "@/add-os/modules/hr/types/time"
import { h } from "vue"
import ActiveTag from "@/add-os/modules/hr/components/ActiveTag.vue"
import { arabicRequiredRule } from "@/add-os/modules/hr/utils/forms"
import { minutesLabel } from "@/add-os/modules/hr/utils/time"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { formatClockTime, formatDate, formatNumber } from "@/add-os/utils/format"

/**
 * Shift templates and attendance policies, edited through ResourceTable +
 * ResourceFormDrawer. Rules mirror StoreShiftTemplateRequest and
 * StoreAttendancePolicyRequest; work patterns have their own drawer.
 */

// ── Shifts ──────────────────────────────────────────────────────────────────

export interface ShiftForm extends Record<string, unknown> {
	code: string
	name: Bilingual
	starts_at: string
	ends_at: string
	break_minutes: number | null
	is_active: boolean
}

export function emptyShiftForm(): ShiftForm {
	return { code: "", name: { ar: "", en: "" }, starts_at: "", ends_at: "", break_minutes: 0, is_active: true }
}

export function buildShiftColumns(t: ComposerTranslation): DataTableColumns<ShiftTemplate> {
	return [
		{ title: t("hr.org.code"), key: "code", minWidth: 100, render: row => h("span", { class: "font-mono", dir: "ltr" }, row.code) },
		{ title: t("hrAttendance.shifts.name"), key: "name", minWidth: 150, render: row => translated(row.name) },
		{
			title: t("hrAttendance.shifts.hours"),
			key: "starts_at",
			minWidth: 190,
			render: row => `${formatClockTime(row.starts_at)} – ${formatClockTime(row.ends_at)}${row.crosses_midnight ? ` (${t("hrAttendance.shifts.overnight")})` : ""}`
		},
		{ title: t("hrAttendance.shifts.break"), key: "break_minutes", minWidth: 100, render: row => minutesLabel(t, row.break_minutes) },
		{ title: t("hrAttendance.shifts.planned"), key: "planned_minutes", minWidth: 110, render: row => minutesLabel(t, row.planned_minutes) },
		{ title: t("hr.common.status"), key: "is_active", minWidth: 100, render: row => h(ActiveTag, { active: row.is_active }) }
	]
}

export function buildShiftFields(t: ComposerTranslation): FieldDescriptor<ShiftForm>[] {
	return [
		{ key: "name", labelKey: "hrAttendance.shifts.name", type: "bilingual-text", rule: arabicRequiredRule(t, "hrAttendance.shifts.name") },
		{ key: "code", labelKey: "hr.org.code", type: "text", required: true },
		{ key: "starts_at", labelKey: "hrAttendance.shifts.startsAt", type: "time", required: true },
		{ key: "ends_at", labelKey: "hrAttendance.shifts.endsAt", type: "time", required: true },
		{ key: "break_minutes", labelKey: "hrAttendance.shifts.breakMinutes", type: "number", integer: true, min: 0, hint: () => t("hrAttendance.shifts.overnightHint") },
		{ key: "is_active", labelKey: "hr.common.active", type: "switch" }
	]
}

// ── Attendance policies ─────────────────────────────────────────────────────

export interface AttendancePolicyForm extends Record<string, unknown> {
	effective_from: string
	effective_to: string
	grace_minutes: number | null
	early_leave_grace_minutes: number | null
	min_overtime_minutes: number | null
	overtime_requires_pre_approval: boolean
	entry_tolerance_minutes: number | null
}

export function emptyAttendancePolicyForm(): AttendancePolicyForm {
	return {
		effective_from: "",
		effective_to: "",
		grace_minutes: 0,
		early_leave_grace_minutes: 0,
		min_overtime_minutes: 0,
		overtime_requires_pre_approval: false,
		entry_tolerance_minutes: 0
	}
}

export function buildAttendancePolicyColumns(t: ComposerTranslation): DataTableColumns<AttendancePolicy> {
	const mins = (n: number) => t("hrAttendance.policies.minutes", { n: formatNumber(n) })
	return [
		{
			title: t("hrLeave.policies.effective"),
			key: "effective_from",
			minWidth: 190,
			render: row => (row.effective_to ? `${formatDate(row.effective_from)} – ${formatDate(row.effective_to)}` : t("hr.career.since", { date: formatDate(row.effective_from) }))
		},
		{ title: t("hrAttendance.policies.grace"), key: "grace_minutes", minWidth: 110, render: row => mins(row.grace_minutes) },
		{ title: t("hrAttendance.policies.earlyLeaveGrace"), key: "early_leave_grace_minutes", minWidth: 130, render: row => mins(row.early_leave_grace_minutes) },
		{ title: t("hrAttendance.policies.minOvertime"), key: "min_overtime_minutes", minWidth: 130, render: row => mins(row.min_overtime_minutes) },
		{
			title: t("hrAttendance.policies.preApproval"),
			key: "overtime_requires_pre_approval",
			minWidth: 140,
			render: row => (row.overtime_requires_pre_approval ? t("hr.common.yes") : t("hr.common.no"))
		},
		{ title: t("hrAttendance.policies.entryTolerance"), key: "entry_tolerance_minutes", minWidth: 130, render: row => mins(row.entry_tolerance_minutes) }
	]
}

export function buildAttendancePolicyFields(t: ComposerTranslation): FieldDescriptor<AttendancePolicyForm>[] {
	const hint = (key: string) => () => t(`hrAttendance.policies.hints.${key}`)
	return [
		{ key: "effective_from", labelKey: "hrLeave.policies.effectiveFrom", type: "date", required: true },
		{ key: "effective_to", labelKey: "hrLeave.policies.effectiveTo", type: "date" },
		{ key: "grace_minutes", labelKey: "hrAttendance.policies.grace", type: "number", integer: true, min: 0, hint: hint("grace") },
		{ key: "early_leave_grace_minutes", labelKey: "hrAttendance.policies.earlyLeaveGrace", type: "number", integer: true, min: 0, hint: hint("earlyLeaveGrace") },
		{ key: "min_overtime_minutes", labelKey: "hrAttendance.policies.minOvertime", type: "number", integer: true, min: 0, hint: hint("minOvertime") },
		{ key: "overtime_requires_pre_approval", labelKey: "hrAttendance.policies.preApproval", type: "switch" },
		{ key: "entry_tolerance_minutes", labelKey: "hrAttendance.policies.entryTolerance", type: "number", integer: true, min: 0, hint: hint("entryTolerance") }
	]
}
