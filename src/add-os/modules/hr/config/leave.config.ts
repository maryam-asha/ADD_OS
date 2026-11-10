import type { DataTableColumns, SelectOption } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { Bilingual, FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { CoverageRule, Holiday } from "@/add-os/modules/hr/types/leave"
import { h } from "vue"
import ActiveTag from "@/add-os/modules/hr/components/ActiveTag.vue"
import { arabicRequiredRule } from "@/add-os/modules/hr/utils/forms"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { formatDate, formatNumber } from "@/add-os/utils/format"

/**
 * Leave settings edited through ResourceTable + ResourceFormDrawer. Rules
 * mirror ADD Core's Store*Request classes for holidays and coverage rules.
 * Leave types are edited beside their list (LeaveTypeEditor) since
 * 2026-11-10; policies have their own dialog (LeavePolicyModal).
 */

const yesNo = (t: ComposerTranslation, value: boolean) => (value ? t("hr.common.yes") : t("hr.common.no"))

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
