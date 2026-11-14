/**
 * Project management — what the screens derive from a project or a task: the
 * tone's colour, the priority's tag, and which due group a task falls in.
 */

import type { ProjectTone, Task, TaskPriority } from "../types/pm"

/**
 * Each tone is a brand colour, by custom property (`theme/tokens.generated.css`):
 * the screens never carry a colour value of their own.
 */
const TONE_VARS: Record<ProjectTone, string> = {
	olive: "var(--add-brand-smart-olive)",
	teal: "var(--add-brand-deep-teal)",
	slate: "var(--add-brand-levant-deep-teal)",
	green: "var(--add-brand-soft-growth-green)",
	cyan: "var(--add-brand-signal-cyan)",
	stone: "var(--add-brand-aleppo-stone)"
}

export function toneVar(tone: ProjectTone): string {
	return TONE_VARS[tone]
}

export type PriorityTagType = "error" | "warning" | "info" | "default"

export interface PriorityTag {
	/** The Naive UI tag type. */
	type: PriorityTagType
	/** The i18n key of the label. */
	labelKey: string
	icon: string
}

const PRIORITY_TYPES: Record<TaskPriority, PriorityTagType> = {
	urgent: "error",
	high: "warning",
	normal: "info",
	low: "default"
}

/** How a priority is drawn; null for a task with none. */
export function priorityTag(priority: TaskPriority | null | undefined): PriorityTag | null {
	if (!priority) return null
	return { type: PRIORITY_TYPES[priority], labelKey: `pm.priority.${priority}`, icon: "carbon:flag" }
}

export type DueGroup = "overdue" | "today" | "week" | "later" | "none" | "done"

/** A local calendar day as `Y-m-d`, the form the API sends dates in. */
function dayOf(value: string | Date): string {
	if (typeof value === "string") return value.slice(0, 10)
	const month = String(value.getMonth() + 1).padStart(2, "0")
	const day = String(value.getDate()).padStart(2, "0")
	return `${value.getFullYear()}-${month}-${day}`
}

/** `day` moved by `days`, on the calendar (no clock, so no daylight-saving drift). */
function addDays(day: string, days: number): string {
	const [year, month, date] = day.split("-").map(Number)
	const moved = new Date(Date.UTC(year, month - 1, date + days))
	return moved.toISOString().slice(0, 10)
}

/**
 * Where a task sits against `today`, the way ADD Core counts it: a finished
 * task is done whatever its date; before today is overdue; "week" is tomorrow
 * through today + 7.
 */
export function dueGroup(task: Pick<Task, "status" | "due_on">, today: string | Date): DueGroup {
	if (task.status === "done") return "done"
	if (!task.due_on) return "none"
	const due = dayOf(task.due_on)
	const now = dayOf(today)
	if (due < now) return "overdue"
	if (due === now) return "today"
	return due <= addDays(now, 7) ? "week" : "later"
}
