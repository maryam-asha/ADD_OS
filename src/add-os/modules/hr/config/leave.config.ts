import type { DataTableColumns, SelectOption } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { Bilingual, FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { CoverageRule, Holiday, LeaveType, LeaveUnit } from "@/add-os/modules/hr/types/leave"
import { h } from "vue"
import ActiveTag from "@/add-os/modules/hr/components/ActiveTag.vue"
import { LEAVE_UNITS } from "@/add-os/modules/hr/types/leave"
import { arabicRequiredRule } from "@/add-os/modules/hr/utils/forms"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { formatDate, formatNumber } from "@/add-os/utils/format"

/**
 * Leave settings edited through ResourceTable + ResourceFormDrawer. Rules
 * mirror ADD Core's Store*Request classes for leave types, holidays and
 * coverage rules; policies have their own drawer (LeavePolicyModal).
 */

const yesNo = (t: ComposerTranslation, value: boolean) => (value ? t("hr.common.yes") : t("hr.common.no"))

// ── Leave types ─────────────────────────────────────────────────────────────

export interface LeaveTypeForm extends Record<string, unknown> {
	code: string
	name: Bilingual
	unit: LeaveUnit
	is_paid: boolean
	tracks_balance: boolean
	allows_half_day: boolean
	counts_calendar_days: boolean
	hide_reason: boolean
	attachment_document_type_id: number | null
	is_active: boolean
	/** Not sent: the unit is fixed once the type exists. */
	editing: boolean
}

export function emptyLeaveTypeForm(): LeaveTypeForm {
	return {
		code: "",
		name: { ar: "", en: "" },
		unit: "day",
		is_paid: true,
		tracks_balance: true,
		allows_half_day: false,
		counts_calendar_days: false,
		hide_reason: false,
		attachment_document_type_id: null,
		is_active: true,
		editing: false
	}
}

export function buildLeaveTypeColumns(t: ComposerTranslation): DataTableColumns<LeaveType> {
	return [
		{ title: t("hr.org.code"), key: "code", minWidth: 100, render: row => h("span", { class: "font-mono", dir: "ltr" }, row.code) },
		{ title: t("hrLeave.types.name"), key: "name", minWidth: 160, render: row => translated(row.name) },
		{ title: t("hrLeave.types.unit"), key: "unit", minWidth: 80, render: row => t(`hrLeave.unit.${row.unit}`) },
		{ title: t("hrLeave.types.isPaid"), key: "is_paid", minWidth: 80, render: row => yesNo(t, row.is_paid) },
		{ title: t("hrLeave.types.tracksBalance"), key: "tracks_balance", minWidth: 110, render: row => yesNo(t, row.tracks_balance) },
		{ title: t("hrLeave.types.requiresAttachment"), key: "requires_attachment", minWidth: 110, render: row => yesNo(t, row.requires_attachment) },
		{ title: t("hr.common.status"), key: "is_active", minWidth: 100, render: row => h(ActiveTag, { active: row.is_active }) }
	]
}

export function buildLeaveTypeFields(t: ComposerTranslation, documentTypes: SelectOption[]): FieldDescriptor<LeaveTypeForm>[] {
	return [
		{ key: "name", labelKey: "hrLeave.types.name", type: "bilingual-text", rule: arabicRequiredRule(t, "hrLeave.types.name") },
		{ key: "code", labelKey: "hr.org.code", type: "text", required: true },
		{
			key: "unit",
			labelKey: "hrLeave.types.unit",
			type: "select",
			required: true,
			options: LEAVE_UNITS.map(unit => ({ label: t(`hrLeave.unit.${unit}`), value: unit })),
			disabledWhen: model => model.editing
		},
		{ key: "is_paid", labelKey: "hrLeave.types.isPaid", type: "switch" },
		{ key: "tracks_balance", labelKey: "hrLeave.types.tracksBalance", type: "switch" },
		{ key: "allows_half_day", labelKey: "hrLeave.types.allowsHalfDay", type: "switch", hiddenWhen: model => model.unit === "hour" },
		{ key: "counts_calendar_days", labelKey: "hrLeave.types.countsCalendarDays", type: "switch", hiddenWhen: model => model.unit === "hour" },
		{ key: "hide_reason", labelKey: "hrLeave.types.hideReason", type: "switch" },
		{ key: "attachment_document_type_id", labelKey: "hrLeave.types.attachmentType", type: "select", options: documentTypes },
		{ key: "is_active", labelKey: "hr.common.active", type: "switch" }
	]
}

// ── Holidays ────────────────────────────────────────────────────────────────

export interface HolidayForm extends Record<string, unknown> {
	name: Bilingual
	starts_on: string
	ends_on: string
	recurs_annually: boolean
}

export function emptyHolidayForm(): HolidayForm {
	return { name: { ar: "", en: "" }, starts_on: "", ends_on: "", recurs_annually: false }
}

export function buildHolidayColumns(t: ComposerTranslation): DataTableColumns<Holiday> {
	return [
		{ title: t("hrLeave.holidays.name"), key: "name", minWidth: 180, render: row => translated(row.name) },
		{
			title: t("hrLeave.holidays.dates"),
			key: "starts_on",
			minWidth: 200,
			render: row => (row.starts_on === row.ends_on ? formatDate(row.starts_on) : `${formatDate(row.starts_on)} – ${formatDate(row.ends_on)}`)
		},
		{ title: t("hrLeave.holidays.recurs"), key: "recurs_annually", minWidth: 110, render: row => yesNo(t, row.recurs_annually) }
	]
}

export function buildHolidayFields(t: ComposerTranslation): FieldDescriptor<HolidayForm>[] {
	return [
		{ key: "name", labelKey: "hrLeave.holidays.name", type: "bilingual-text", rule: arabicRequiredRule(t, "hrLeave.holidays.name") },
		{ key: "starts_on", labelKey: "hrLeave.holidays.startsOn", type: "date", required: true },
		{ key: "ends_on", labelKey: "hrLeave.holidays.endsOn", type: "date", required: true },
		{ key: "recurs_annually", labelKey: "hrLeave.holidays.recurs", type: "switch" }
	]
}

// ── Coverage rules ──────────────────────────────────────────────────────────

export interface CoverageForm extends Record<string, unknown> {
	org_unit_id: number | null
	position_id: number | null
	min_present: number | null
	is_active: boolean
	/** Not sent: a rule's unit or position is fixed once it exists. */
	editing: boolean
}

export function emptyCoverageForm(): CoverageForm {
	return { org_unit_id: null, position_id: null, min_present: 1, is_active: true, editing: false }
}

export function buildCoverageColumns(t: ComposerTranslation, scopeName: (rule: CoverageRule) => string): DataTableColumns<CoverageRule> {
	return [
		{ title: t("hrLeave.coverage.scope"), key: "scope", minWidth: 220, render: row => scopeName(row) || EMPTY },
		{ title: t("hrLeave.coverage.minPresent"), key: "min_present", minWidth: 120, align: "center", render: row => formatNumber(row.min_present) },
		{ title: t("hr.common.status"), key: "is_active", minWidth: 100, render: row => h(ActiveTag, { active: row.is_active }) }
	]
}

/** A rule is for one unit or one position — choosing one locks the other. Options are loaded by the page. */
export function buildCoverageFields(units: SelectOption[], positions: SelectOption[]): FieldDescriptor<CoverageForm>[] {
	return [
		{ key: "org_unit_id", labelKey: "hr.hire.orgUnit", type: "select", options: units, disabledWhen: model => model.editing || model.position_id !== null },
		{ key: "position_id", labelKey: "hr.hire.position", type: "select", options: positions, disabledWhen: model => model.editing || model.org_unit_id !== null },
		{ key: "min_present", labelKey: "hrLeave.coverage.minPresent", type: "number", required: true, integer: true, min: 1 },
		{ key: "is_active", labelKey: "hr.common.active", type: "switch" }
	]
}
