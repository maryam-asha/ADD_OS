/**
 * Project management — small display helpers the screens share: a `Y-m-d` day
 * as a local date, a person's initials, and the sentence for a refusal.
 */

import type { Project } from "@/add-os/modules/pm/types/pm"
import { ApiError } from "@/add-os/services/api"

/**
 * A `Y-m-d` day as a local calendar date. `new Date("2026-11-14")` is UTC
 * midnight, which reads as the day before west of Greenwich.
 */
export function dayDate(day: string): Date {
	const [year, month, date] = day.slice(0, 10).split("-").map(Number)
	return new Date(year, month - 1, date)
}

/** `Y-m-d` of a local date, the form the API takes. */
export function dayString(value: Date): string {
	const month = String(value.getMonth() + 1).padStart(2, "0")
	const date = String(value.getDate()).padStart(2, "0")
	return `${value.getFullYear()}-${month}-${date}`
}

/** Up to two initials of a name: the first letters of its first two words. */
export function initialsOf(name: string): string {
	return name.trim().split(/\s+/).slice(0, 2).map(word => Array.from(word)[0] ?? "").join("")
}

const REFUSAL_CODES = ["assign_forbidden", "project_archived", "assignee_not_member", "due_before_start", "subtask_depth"]

/**
 * What to tell the person when a request fails: the translated sentence for a
 * refusal's `code`, else the server's own message, else `fallback`.
 */
export function refusalText(error: unknown, t: (key: string) => string, fallback: string): string {
	if (!(error instanceof ApiError)) return fallback
	const data = error.data as { message?: string; code?: string } | undefined
	if (data?.code && REFUSAL_CODES.includes(data.code)) return t(`pm.refusal.${data.code}`)
	return data?.message ?? fallback
}

/**
 * Whether the signed-in account may add tasks to `project`: the project must
 * not be archived, and the account runs it, leads it or is one of its members.
 * A viewer who is none of those can read the project but every write is refused.
 */
export function mayAddTasks(project: Pick<Project, "is_archived" | "can" | "members">, userId: number | undefined): boolean {
	if (project.is_archived) return false
	if (project.can.manage || project.can.lead) return true
	return userId !== undefined && project.members.some(person => person.id === userId)
}
