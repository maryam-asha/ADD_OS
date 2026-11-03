import type { PlanPayload } from "@/add-os/modules/plans/types/plan"

type Translate = (key: string, values?: Record<string, unknown>) => string

/** One card of the member's "My plan" screen, as ADDCore's memberships/current draws it. */
export interface PreviewStat {
	key: string
	type: "period" | "hours" | "discount" | "balance" | "resource"
	display: "ring" | "value"
	title: string
	total: number | null
	used: number
	remaining: number | null
	percent: number | null
	percent_off?: number
}

/**
 * The plan as the member will see it, with sample usage: half of every
 * total, nothing for an unlimited one. Same order and the same ring/value
 * rule as ADDCore's CurrentMembershipStats, so the form shows what the app
 * will draw.
 */
export function previewStats(model: PlanPayload, t: Translate): PreviewStat[] {
	const card = (key: string, type: PreviewStat["type"], title: string, total: number | null, extra: Partial<PreviewStat> = {}): PreviewStat => {
		const used = total === null ? 0 : Math.floor(total / 2)
		return {
			key,
			type,
			display: total === null ? "value" : "ring",
			title,
			total,
			used,
			remaining: total === null ? null : total - used,
			percent: total === null ? null : total > 0 ? Math.round(used / total * 100) : 0,
			...extra
		}
	}

	const seat = model.coworking_seat ?? "none"
	const hours = model.coworking_hours == null || model.coworking_hours === "" ? null : Number(model.coworking_hours)

	return [
		card("period", "period", t("packages.preview.period"), Number(model.duration_days) || 0),
		...(seat === "none" ? [] : [card("workspace_hours", "hours", t("packages.preview.hours"), seat === "flexible" ? hours : null)]),
		...(model.space_hours ?? []).map((row, i) => card(`space_hours:${i}`, "hours", t("packages.preview.freeHours"), Number(row.hours) || 0)),
		...(model.discounts ?? []).filter(d => d.is_active !== false).map((d, i) => card(
			`discount:${i}`,
			"discount",
			t("packages.preview.discount", { percent: d.percentage }),
			d.usage_limit ?? null,
			{ percent_off: Number(d.percentage) }
		)),
		...(model.balances ?? []).map((b, i) => card(`balance:${i}`, "balance", t("packages.preview.balance"), Number(b.amount_points) || 0)),
		...(model.resource_grants ?? []).map((g, i) => card(`resource:${i}`, "resource", t("packages.preview.resource"), Number(g.quantity) || 0))
	]
}
