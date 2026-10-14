import type { DataTableColumns } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { SpaceRow } from "@/add-os/services/dashboard"
import { h } from "vue"
import { spaceTypeLabel } from "@/add-os/modules/booking/config/space-type-label"
import { ltr } from "@/add-os/modules/dashboard/config/bidi"
import { formatNumber } from "@/add-os/utils/format/numbers"

/** A decimal string as a number to sort by; nothing measured sorts last. */
function rank(value: string | null): number {
	return value === null ? -1 : Number.parseFloat(value)
}

function percent(t: ComposerTranslation, value: string | null): string {
	return value === null ? t("dashboard.notAvailable") : ltr(t("dashboard.percent", { value: formatNumber(value, { trimZeros: true }) }))
}

/** "45 min", "1 h 30 min". */
export function durationLabel(t: ComposerTranslation, minutes: number | null): string {
	if (minutes === null) return t("dashboard.notAvailable")
	if (minutes < 60) return t("dashboard.spaces.duration.minutes", { m: minutes })
	return t("dashboard.spaces.duration.hours", { h: Math.floor(minutes / 60), m: minutes % 60 })
}

/**
 * One row per space, every figure sortable. Occupancy draws its bar; a
 * Co-Space says why it has none rather than showing an empty one.
 */
export function buildSpaceColumns(t: ComposerTranslation): DataTableColumns<SpaceRow> {
	const muted = "text-[var(--add-text-muted)]"

	return [
		{
			key: "space",
			title: t("dashboard.spaces.columns.space"),
			minWidth: 180,
			render: row => h("div", { class: "flex flex-col" }, [
				h("span", { class: "font-bold text-[var(--add-text-primary)]" }, row.space.name ?? `#${row.space.id}`),
				h("span", { class: `text-xs ${muted}` }, `${spaceTypeLabel(t, row.space.type)} · ${row.space.branch.name ?? ""}`)
			])
		},
		{
			key: "bookings",
			title: t("dashboard.spaces.columns.bookings"),
			sorter: (a, b) => a.bookings - b.bookings,
			render: row => h("span", { class: "font-bold" }, formatNumber(row.bookings))
		},
		{
			key: "average_per_day",
			title: t("dashboard.spaces.columns.perDay"),
			sorter: (a, b) => rank(a.average_per_day) - rank(b.average_per_day),
			render: row => row.average_per_day === null ? h("span", { class: muted }, t("dashboard.notAvailable")) : formatNumber(row.average_per_day, { trimZeros: true })
		},
		{
			key: "average_per_week",
			title: t("dashboard.spaces.columns.perWeek"),
			sorter: (a, b) => rank(a.average_per_week) - rank(b.average_per_week),
			render: row => formatNumber(row.average_per_week, { trimZeros: true })
		},
		{
			key: "average_duration_minutes",
			title: t("dashboard.spaces.columns.duration"),
			sorter: (a, b) => (a.average_duration_minutes ?? -1) - (b.average_duration_minutes ?? -1),
			render: row => durationLabel(t, row.average_duration_minutes)
		},
		{
			key: "occupancy_percent",
			title: t("dashboard.spaces.columns.occupancy"),
			minWidth: 150,
			sorter: (a, b) => rank(a.occupancy_percent) - rank(b.occupancy_percent),
			render: row => row.occupancy_percent === null
				? h("span", { class: `text-xs ${muted}`, title: t("dashboard.spaces.pooledNote") }, t("dashboard.spaces.pooled"))
				: h("div", { class: "flex items-center gap-2" }, [
						h("div", { class: "h-1.5 w-16 overflow-hidden rounded-full bg-[var(--add-surface-sunken)]" }, [
							h("div", { class: "h-full rounded-full bg-[var(--add-primary)]", style: { width: `${Math.min(100, Number.parseFloat(row.occupancy_percent))}%` } })
						]),
						h("span", { class: "text-sm font-semibold" }, percent(t, row.occupancy_percent))
					])
		},
		{
			key: "no_show_rate",
			title: t("dashboard.spaces.columns.noShow"),
			sorter: (a, b) => rank(a.no_show_rate) - rank(b.no_show_rate),
			render: row => percent(t, row.no_show_rate)
		},
		{
			key: "cancellation_rate",
			title: t("dashboard.spaces.columns.cancellation"),
			sorter: (a, b) => rank(a.cancellation_rate) - rank(b.cancellation_rate),
			render: row => percent(t, row.cancellation_rate)
		},
		{
			key: "members",
			title: t("dashboard.spaces.columns.members"),
			sorter: (a, b) => a.members - b.members,
			render: row => formatNumber(row.members)
		}
	]
}
