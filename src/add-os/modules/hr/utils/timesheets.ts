import type { ComposerTranslation } from "vue-i18n"
import type { Translatable } from "@/add-os/modules/hr/types/hr"
import type { CostCenter, TimesheetEntry } from "@/add-os/modules/hr/types/timesheets"
import { TIMESHEET_INCREMENT_HOURS, TIMESHEET_WEEK_STARTS_ON } from "@/add-os/modules/hr/types/timesheets"
import { addDays, isoWeekday } from "@/add-os/modules/hr/utils/time"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { formatNumber } from "@/add-os/utils/format"

/** The first day of the timesheet week a `yyyy-MM-dd` falls in. */
export function weekStartOf(date: string): string {
	return addDays(date, -((isoWeekday(date) - TIMESHEET_WEEK_STARTS_ON + 7) % 7))
}

/** The seven days of the week starting on `weekStart`. */
export function weekDays(weekStart: string): string[] {
	return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

/** Hours as written by the server ("7.50", "-1.5", 8): a number, zero for anything unreadable. */
export function hoursValue(hours: string | number | null | undefined): number {
	const value = typeof hours === "number" ? hours : Number.parseFloat(hours ?? "")
	return Number.isFinite(value) ? value : 0
}

/** "7.5 h"; zero reads as a dash unless `zero` asks for it. */
export function hoursLabel(t: ComposerTranslation, hours: string | number | null | undefined, zero = false): string {
	const value = hoursValue(hours)
	if (!value && !zero) return EMPTY
	return t("hrTimesheets.hours", { n: formatNumber(value, { fractionDigits: 2, trimZeros: true }) })
}

/** "CODE · name" of a cost center, whichever half it has alone, a dash for neither. */
export function centerName(center: { code: string | null; name: Translatable | null }): string {
	const name = translated(center.name)
	return [center.code, name].filter(Boolean).join(" · ") || EMPTY
}

/** A cost center's name by id; a dash when it is not in the list. */
export function costCenterLabel(centers: CostCenter[], id: number | null | undefined): string {
	const center = centers.find(c => c.id === id)
	return center ? centerName(center) : EMPTY
}

/** Whether hours fall on the step the server accepts (0.5 by default). */
export function onIncrement(hours: number): boolean {
	const steps = hours / TIMESHEET_INCREMENT_HOURS
	return Math.abs(steps - Math.round(steps)) < 0.0001
}

/**
 * One line of the weekly grid: a cost center, its hours by day, and the
 * notes of its entries. A note typed on the line replaces every entry's own
 * note; until then each entry keeps the note it came with.
 */
export interface GridRow {
	key: number
	cost_center_id: number | null
	hours: Record<string, number | null>
	notes: Record<string, string | null>
	note: string | null
	noteEdited: boolean
}

let rowKey = 0

export function emptyGridRow(days: string[], costCenterId: number | null = null): GridRow {
	return {
		key: ++rowKey,
		cost_center_id: costCenterId,
		hours: Object.fromEntries(days.map(day => [day, null])),
		notes: {},
		note: null,
		noteEdited: false
	}
}

/**
 * The week's entries as one line per cost center. Two entries for the same
 * center and day (possible from another client) add up into one cell, and
 * keep the first note.
 */
export function entriesToGrid(entries: TimesheetEntry[], days: string[]): GridRow[] {
	const rows = new Map<number, GridRow>()
	for (const entry of entries) {
		let row = rows.get(entry.cost_center_id)
		if (!row) {
			row = emptyGridRow(days, entry.cost_center_id)
			rows.set(entry.cost_center_id, row)
		}
		const day = entry.work_date
		row.hours[day] = (row.hours[day] ?? 0) + hoursValue(entry.hours)
		if (entry.note && !row.notes[day]) row.notes[day] = entry.note
	}
	for (const row of rows.values()) {
		const notes = new Set(Object.values(row.notes))
		const filled = Object.keys(row.notes).length
		const logged = Object.values(row.hours).filter(h => h).length
		// One note shared by every logged day reads as the line's note.
		if (notes.size === 1 && filled === logged) row.note = [...notes][0]
	}
	return [...rows.values()]
}

/** The grid back as the entries `PUT me/timesheets/{week}` replaces the week with: empty cells and lines without a center drop out. */
export function gridToEntries(rows: GridRow[]): Omit<TimesheetEntry, "id">[] {
	const entries: Omit<TimesheetEntry, "id">[] = []
	for (const row of rows) {
		if (row.cost_center_id === null) continue
		for (const [day, hours] of Object.entries(row.hours)) {
			if (!hours) continue
			const note = row.noteEdited ? row.note?.trim() || null : (row.notes[day] ?? null)
			entries.push({ cost_center_id: row.cost_center_id, work_date: day, hours, note })
		}
	}
	return entries
}

/** Hours a day carries across every line of the grid. */
export function dayTotal(rows: GridRow[], day: string): number {
	return rows.reduce((sum, row) => sum + (row.hours[day] ?? 0), 0)
}
