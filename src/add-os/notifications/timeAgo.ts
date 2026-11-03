/**
 * How long ago a notice arrived, as a unit and a count the bell words through
 * counted messages (`notifications.time.*`, `countKey`) — Arabic has six
 * plural forms, so the wording is the language file's, not this module's.
 * Past a week it is a date, through `formatDate`. A time a little in the
 * future (a clock behind the server's) reads as now.
 */
export type TimeAgo = { unit: "now" } | { unit: "minutes" | "hours" | "days"; count: number } | { unit: "date" }

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export function timeAgo(value: string | Date, now: number = Date.now()): TimeAgo {
	const elapsed = now - new Date(value).getTime()

	if (Number.isNaN(elapsed) || elapsed < MINUTE) return { unit: "now" }
	if (elapsed < HOUR) return { unit: "minutes", count: Math.floor(elapsed / MINUTE) }
	if (elapsed < DAY) return { unit: "hours", count: Math.floor(elapsed / HOUR) }
	if (elapsed < 7 * DAY) return { unit: "days", count: Math.floor(elapsed / DAY) }
	return { unit: "date" }
}
