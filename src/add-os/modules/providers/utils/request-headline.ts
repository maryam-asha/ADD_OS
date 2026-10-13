import type { ComposerTranslation } from "vue-i18n"
import type { Bilingual } from "@/add-os/components/resource/field-types"
import type { ProviderRequest } from "@/add-os/modules/providers/types"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { formatNumber } from "@/add-os/utils/format"

/** The Carbon icon that stands for each kind of request, everywhere it is shown. */
export const REQUEST_TYPE_ICON: Record<ProviderRequest["type"], string> = {
	plan_assignment: "carbon:user-multiple",
	wallet_top_up: "carbon:wallet",
	company_member: "carbon:user-follow",
	company_admin: "carbon:user-admin",
	plan_design: "carbon:document-add"
}

/**
 * A request as one plain sentence — who asks for what, for whom — so a
 * reviewer reads the ask instead of decoding a type label and a payload.
 */
export function requestHeadline(request: ProviderRequest, t: ComposerTranslation, planNames: Record<number, string> = {}): string {
	const p = request.payload ?? {}
	const provider = request.provider?.name ?? t("providerRequests.headline.someProvider")
	const company = request.company?.legal_name ?? (request.company ? `#${request.company.id}` : "")

	switch (request.type) {
		case "plan_assignment": {
			const planId = Number(p.plan_id)
			return t("providerRequests.headline.plan_assignment", {
				provider,
				company,
				plan: planNames[planId] ?? `#${planId}`,
				seats: formatNumber(Number(p.seats ?? 0))
			})
		}
		case "wallet_top_up":
			return t("providerRequests.headline.wallet_top_up", { provider, company, points: formatNumber(Number(p.points ?? 0)) })
		case "company_member":
			return t("providerRequests.headline.company_member", { provider, company, name: String(p.name ?? "—") })
		case "company_admin":
			return t("providerRequests.headline.company_admin", { provider, company, user: p.user_name ? String(p.user_name) : `#${String(p.user_id ?? "")}` })
		case "plan_design": {
			const name = p.name && typeof p.name === "object" ? pickLocalized(p.name as Bilingual, currentLocale.value) : String(p.name ?? "—")
			return t("providerRequests.headline.plan_design", { provider, plan: name || "—" })
		}
	}
}

/** Whole days a request has been waiting. */
export function daysWaiting(createdAt: string, now: Date = new Date()): number {
	const created = new Date(createdAt).getTime()
	return Number.isNaN(created) ? 0 : Math.max(0, Math.floor((now.getTime() - created) / 86_400_000))
}

/** How urgent a pending request has become: the reviewer's eye goes to the oldest first. */
export type WaitLevel = "fresh" | "aging" | "late"

export function waitLevel(days: number): WaitLevel {
	if (days >= 5) return "late"
	if (days >= 2) return "aging"
	return "fresh"
}

/** The ask in a few words, for a table cell — the plan and seats, the points, the person. */
export function requestSummary(request: ProviderRequest, t: ComposerTranslation, planNames: Record<number, string> = {}): string {
	const p = request.payload ?? {}
	switch (request.type) {
		case "plan_assignment": {
			const planId = Number(p.plan_id)
			return t("providerRequests.summary.plan_assignment", { plan: planNames[planId] ?? `#${planId}`, seats: formatNumber(Number(p.seats ?? 0)) })
		}
		case "wallet_top_up":
			return t("providerRequests.summary.wallet_top_up", { points: formatNumber(Number(p.points ?? 0)) })
		case "company_member":
			return [p.name, p.phone].filter(Boolean).map(String).join(" · ") || "—"
		case "company_admin":
			return p.user_name ? String(p.user_name) : t("providerRequests.summary.company_admin", { id: String(p.user_id ?? "") })
		case "plan_design": {
			const name = p.name && typeof p.name === "object" ? pickLocalized(p.name as Bilingual, currentLocale.value) : String(p.name ?? "")
			return name || "—"
		}
	}
}
