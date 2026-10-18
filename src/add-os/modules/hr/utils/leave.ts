import type { ComposerTranslation } from "vue-i18n"
import type { HalfDay, LeaveUnit } from "@/add-os/modules/hr/types/leave"
import { EMPTY } from "@/add-os/modules/hr/utils/translated"
import { formatDate, formatNumber } from "@/add-os/utils/format"

/**
 * An amount of leave in its unit: "3 days", "2.5 hours". The server sends it
 * as a decimal string; the plural follows the number it reads as, and the
 * digits are the server's own.
 */
export function leaveAmount(t: ComposerTranslation, amount: string | null, unit: LeaveUnit): string {
	if (amount === null || amount === "") return EMPTY
	const count = Math.abs(Number(amount))
	const key = unit === "hour" ? "hrLeave.amount.hours" : "hrLeave.amount.days"
	return t(key, { n: formatNumber(amount) }, Number.isFinite(count) && count === 1 ? 1 : 2)
}

/** A request's dates: one day with its half or hours, or a range. */
export function leavePeriod(t: ComposerTranslation, leave: { starts_on: string; ends_on: string; half_day: HalfDay | null; hours?: string | null }): string {
	if (leave.starts_on !== leave.ends_on) return `${formatDate(leave.starts_on)} – ${formatDate(leave.ends_on)}`
	const day = formatDate(leave.starts_on)
	if (leave.half_day) return `${day} · ${t(`hrApprovals.halfDay.${leave.half_day}`)}`
	if (leave.hours) return `${day} · ${leaveAmount(t, leave.hours, "hour")}`
	return day
}

/** Today in the browser, as the API writes dates. */
export function todayIso(): string {
	const now = new Date()
	const pad = (n: number) => String(n).padStart(2, "0")
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** The first and last day of the month a `yyyy-MM` names. */
export function monthRange(month: string): { from: string; to: string; days: number } {
	const [year, m] = month.split("-").map(Number)
	const days = new Date(year, m, 0).getDate()
	const pad = (n: number) => String(n).padStart(2, "0")
	return { from: `${year}-${pad(m)}-01`, to: `${year}-${pad(m)}-${pad(days)}`, days }
}
