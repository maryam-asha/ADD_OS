import type { ComposerTranslation } from "vue-i18n"
import { EMPTY } from "@/add-os/modules/hr/utils/translated"
import { formatClockTime, formatNumber } from "@/add-os/utils/format"

/**
 * The organisation's wall clock from an HR instant. The server sends
 * attendance times as ISO 8601 already in the organisation's time zone
 * (LocalTime::iso), so the clock is read from the string as written —
 * staff on VPN from elsewhere see the time the punch clock saw, not their
 * own zone's.
 */
export function orgClock(iso: string | null | undefined): string {
	if (!iso) return EMPTY
	const match = /T(\d{2}:\d{2})/.exec(iso)
	return match ? formatClockTime(match[1]) : EMPTY
}

/** The organisation-local date of an HR instant, `yyyy-MM-dd`. */
export function orgDate(iso: string | null | undefined): string | null {
	return iso ? iso.slice(0, 10) : null
}

/** Minutes as "1 h 35 min"; zero and null read as a dash. */
export function minutesLabel(t: ComposerTranslation, minutes: number | null | undefined): string {
	if (!minutes) return EMPTY
	const sign = minutes < 0 ? "-" : ""
	const total = Math.abs(minutes)
	return sign + t("hrApprovals.summary.hoursMinutes", { h: formatNumber(Math.floor(total / 60)), m: formatNumber(total % 60) })
}

/** A `yyyy-MM-dd` moved by whole days, without time-zone drift. */
export function addDays(date: string, days: number): string {
	const [y, m, d] = date.split("-").map(Number)
	const moved = new Date(Date.UTC(y, m - 1, d + days))
	return moved.toISOString().slice(0, 10)
}

/** The ISO weekday (1 Monday … 7 Sunday) of a `yyyy-MM-dd`. */
export function isoWeekday(date: string): number {
	const [y, m, d] = date.split("-").map(Number)
	return new Date(Date.UTC(y, m - 1, d)).getUTCDay() || 7
}
