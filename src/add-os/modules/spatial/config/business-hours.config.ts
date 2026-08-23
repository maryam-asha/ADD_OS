import type { DataTableColumns, FormItemRule, SelectOption } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { BusinessHour, BusinessHourPayload, DayOfWeek } from "@/add-os/modules/spatial/types/business-hour"
import type { BusinessHourException, BusinessHourExceptionPayload } from "@/add-os/modules/spatial/types/business-hour-exception"

/** Confirmed live: lowercase full English names only — "Sunday" (capitalized) is rejected. */
const DAYS_OF_WEEK: DayOfWeek[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function dayOfWeekOptions(t: ComposerTranslation): SelectOption[] {
	return DAYS_OF_WEEK.map(day => ({ label: t(`businessHours.days.${day}`), value: day }))
}

function timeRule(t: ComposerTranslation, required = true): FormItemRule {
	return {
		required,
		trigger: ["blur", "input"],
		validator: (_rule, value) => {
			// If not required and value is empty/null, pass validation
			if (!required && (value === "" || value === null)) {
				return true
			}
			// Otherwise, validate against pattern
			return (typeof value === "string" && TIME_PATTERN.test(value)) || new Error(t("businessHours.validation.timeFormat"))
		}
	}
}

export function buildBusinessHourColumns(t: ComposerTranslation): DataTableColumns<BusinessHour> {
	return [
		{ title: t("businessHours.columns.dayOfWeek"), key: "day_of_week", render: row => t(`businessHours.days.${row.day_of_week}`) },
		{ title: t("businessHours.columns.openTime"), key: "open_time" },
		{ title: t("businessHours.columns.closeTime"), key: "close_time" }
	]
}

export function businessHourFields(t: ComposerTranslation): FieldDescriptor<BusinessHourPayload>[] {
	return [
		{ key: "day_of_week", labelKey: "businessHours.form.dayOfWeek", type: "select", required: true, options: dayOfWeekOptions(t) },
		{ key: "open_time", labelKey: "businessHours.form.openTime", type: "time", rule: timeRule(t) },
		{ key: "close_time", labelKey: "businessHours.form.closeTime", type: "time", rule: timeRule(t) }
	]
}

export function emptyBusinessHourPayload(branchId: number): BusinessHourPayload {
	return { branch_id: branchId, day_of_week: "sunday", open_time: "", close_time: "" }
}

export function buildBusinessHourExceptionColumns(t: ComposerTranslation): DataTableColumns<BusinessHourException> {
	return [
		{ title: t("businessHours.exceptions.columns.date"), key: "date" },
		{
			title: t("businessHours.exceptions.columns.isClosed"),
			key: "is_closed",
			render: row => t(row.is_closed ? "businessHours.exceptions.isClosedYes" : "businessHours.exceptions.isClosedNo")
		},
		{
			title: t("businessHours.exceptions.columns.hours"),
			key: "hours",
			render: row => (row.is_closed ? "—" : `${row.open_time} – ${row.close_time}`)
		},
		{ title: t("businessHours.exceptions.columns.reason"), key: "reason", render: row => row.reason ?? "—" }
	]
}

/**
 * `isClosed` drives whether open_time/close_time are required at all (an
 * exception marked closed omits them entirely — confirmed live). Callers
 * rebuild this array from a `computed` keyed on the current form model's
 * `is_closed`, so toggling the switch produces a fresh fields array —
 * `ResourceFormDrawer` renders whatever fields array it's given, so when
 * `isClosed` is true the open_time/close_time descriptors are omitted
 * entirely rather than included-but-disabled: `ResourceFormDrawer`'s
 * `:disabled` binding only exists on its `n-select` render branch, so a
 * `disabledWhen` on a `text`-type field has no visual effect there.
 */
export function businessHourExceptionFields(t: ComposerTranslation, isClosed: boolean): FieldDescriptor<BusinessHourExceptionPayload>[] {
	const dateRule: FormItemRule = {
		required: true,
		trigger: ["blur", "input"],
		validator: (_rule, value) => (typeof value === "string" && DATE_PATTERN.test(value)) || new Error(t("businessHours.exceptions.validation.dateFormat"))
	}

	const fields: FieldDescriptor<BusinessHourExceptionPayload>[] = [
		{ key: "date", labelKey: "businessHours.exceptions.form.date", type: "date", rule: dateRule },
		{ key: "is_closed", labelKey: "businessHours.exceptions.form.isClosed", type: "switch" }
	]

	if (!isClosed) {
		// This branch only runs when isClosed is false, so open_time/close_time are always
		// required here — the "not required when closed" case is handled by omitting the
		// fields entirely above, not by a conditional required flag.
		fields.push(
			{ key: "open_time", labelKey: "businessHours.exceptions.form.openTime", type: "time", rule: timeRule(t) },
			{ key: "close_time", labelKey: "businessHours.exceptions.form.closeTime", type: "time", rule: timeRule(t) }
		)
	}

	fields.push({ key: "reason", labelKey: "businessHours.exceptions.form.reason", type: "text" })

	return fields
}

export function emptyBusinessHourExceptionPayload(branchId: number): BusinessHourExceptionPayload {
	return { branch_id: branchId, date: "", is_closed: false, open_time: "", close_time: "", reason: "" }
}
