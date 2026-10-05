import type { VNode } from "vue"
import type { ComposerTranslation } from "vue-i18n"
import { NTag } from "naive-ui"
import { h } from "vue"
import { formatDateTime, formatNumber } from "@/add-os/utils/format"

export type SaleKey = "sale_hourly_rate_points" | "sale_price_points"
export type SaleState = "running" | "scheduled" | "ended" | "none"

const TIME_KEYS = ["sale_starts_at", "sale_ends_at"] as const

function emptyToNull(value: unknown): unknown {
	return value === "" || value === undefined ? null : value
}

/**
 * The three sale fields, ready to send: an empty input becomes `null` and
 * no key is ever dropped. All three `null` ends a running sale (a no-op
 * when there is none); a partial fill goes as it is so the server's
 * `required_with` error lands on the field that is missing.
 */
export function normalizeSale<T extends Record<string, unknown>>(payload: T, saleKey: SaleKey): T {
	const out: Record<string, unknown> = { ...payload }
	out[saleKey] = emptyToNull(out[saleKey])
	for (const key of TIME_KEYS) out[key] = emptyToNull(out[key])
	return out as T
}

/** Where a sale's window stands — a status from two dates, never a price. */
export function saleState(startsAt: string | null, endsAt: string | null, now: Date = new Date()): SaleState {
	if (!startsAt || !endsAt) return "none"
	const time = now.getTime()
	if (time < Date.parse(startsAt)) return "scheduled"
	if (time < Date.parse(endsAt)) return "running"
	return "ended"
}

/**
 * A space's sale needs an hourly rate to be below. Clearing the rate ends
 * the sale rather than sending one the server must refuse.
 */
export function spaceSubmitPayload(payload: Record<string, unknown>): Record<string, unknown> {
	const out = normalizeSale(payload, "sale_hourly_rate_points")
	if (out.hourly_rate_points === null || out.hourly_rate_points === undefined || out.hourly_rate_points === "") {
		out.sale_hourly_rate_points = null
		out.sale_starts_at = null
		out.sale_ends_at = null
	}
	return out
}

/** A running or scheduled sale under a list's price cell; nothing otherwise. */
export function renderSaleBadge(t: ComposerTranslation, salePoints: number | null, startsAt: string | null, endsAt: string | null): VNode | null {
	const state = saleState(startsAt, endsAt)
	if (salePoints === null || (state !== "running" && state !== "scheduled")) return null
	const label = state === "running"
		? t("sale.badgeRunning", { points: formatNumber(salePoints), date: formatDateTime(endsAt as string) })
		: t("sale.badgeScheduled", { points: formatNumber(salePoints), date: formatDateTime(startsAt as string) })
	return h(NTag, { size: "small", round: true, bordered: false, type: state === "running" ? "success" : "info", class: "mt-1" }, { default: () => label })
}
