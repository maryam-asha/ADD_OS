import { formatDate } from "@/add-os/utils/format/dates"

/**
 * The periods the dashboard offers in one click. Each is a pair of local
 * calendar days, both inclusive, ending today; the server compares it with
 * the period of the same length just before it.
 */
export const DASHBOARD_PRESETS = ["today", "last7Days", "thisMonth", "thisYear"] as const

export type DashboardPreset = (typeof DASHBOARD_PRESETS)[number]

export interface DashboardPeriod {
	from: string
	to: string
	/**
	 * Bumped to make whatever was given the period fetch again; never sent,
	 * since the service passes on only the filters it knows.
	 */
	refresh?: number
}

export function presetPeriod(preset: DashboardPreset, today: Date = new Date()): DashboardPeriod {
	const iso = (d: Date) => formatDate(d, { style: "iso" })
	const to = iso(today)

	switch (preset) {
		case "today":
			return { from: to, to }
		case "last7Days":
			return { from: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6)), to }
		case "thisMonth":
			return { from: iso(new Date(today.getFullYear(), today.getMonth(), 1)), to }
		case "thisYear":
			return { from: iso(new Date(today.getFullYear(), 0, 1)), to }
	}
}

/** The preset a period matches, or null for a custom range. */
export function matchPreset(period: DashboardPeriod, today: Date = new Date()): DashboardPreset | null {
	return DASHBOARD_PRESETS.find(preset => {
		const candidate = presetPeriod(preset, today)
		return candidate.from === period.from && candidate.to === period.to
	}) ?? null
}

/**
 * As many days again, ending the day before `period` starts — the period the
 * server compares against (ADD Core `DashboardPeriod::previous()`).
 */
export function previousPeriod(period: DashboardPeriod): DashboardPeriod {
	const from = localDay(period.from)
	const days = Math.round((localDay(period.to).getTime() - from.getTime()) / 86_400_000) + 1
	const iso = (d: Date) => formatDate(d, { style: "iso" })

	return {
		from: iso(new Date(from.getFullYear(), from.getMonth(), from.getDate() - days)),
		to: iso(new Date(from.getFullYear(), from.getMonth(), from.getDate() - 1))
	}
}

/**
 * A "YYYY-MM-DD" day as local midnight. `new Date("2026-10-01")` reads it as
 * UTC midnight, which is the day before anywhere west of Greenwich.
 */
export function localDay(iso: string): Date {
	const [year, month, date] = iso.split("-").map(Number)
	return new Date(year, month - 1, date)
}
