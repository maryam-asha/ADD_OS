import type { DataTableColumns } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { SupportedLocale } from "@/add-os/lang/locales"
import type { Plan, PlanPayload } from "@/add-os/modules/plans/types/plan"
import { NTag } from "naive-ui"
import { h } from "vue"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { STATUS_ICONS } from "@/add-os/theme/tokens"
import { formatClockTime, formatCurrency, formatNumber, isCurrencyCode } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

export function buildPlanColumns(t: ComposerTranslation, locale: SupportedLocale): DataTableColumns<Plan> {
	return [
		{
			title: t("packages.columns.name"),
			key: "name",
			render: row =>
				h("div", { class: "flex flex-col gap-0.5" }, [
					h("span", { class: "font-medium" }, pickLocalized(row.name, locale)),
					row.subtitle ? h("span", { class: "text-xs text-secondary" }, pickLocalized(row.subtitle, locale)) : null
				])
		},
		{
			title: t("packages.columns.module"),
			key: "plan_module_id",
			render: row =>
				row.plan_module
					? h(
							NTag,
							{ type: "warning", round: true, bordered: false, size: "small" },
							{ default: () => pickLocalized(row.plan_module!.name, locale) }
						)
					: h("span", { class: "text-xs text-secondary" }, `— ${t("packages.noModule")} —`)
		},
		{
			title: t("packages.columns.type"),
			key: "is_subscription",
			filterMultiple: false,
			filterOptions: [
				{ label: t("packages.type.subscription"), value: 1 },
				{ label: t("packages.type.oneTime"), value: 0 }
			],
			filter: (value, row) => (value === 1 ? row.is_subscription : !row.is_subscription),
			render: row =>
				h(
					NTag,
					{ type: row.is_subscription ? "info" : "default", round: true, bordered: true },
					{ default: () => t(row.is_subscription ? "packages.type.subscription" : "packages.type.oneTime") }
				)
		},
		{
			title: t("packages.columns.price"),
			key: "price_points",
			// Points lead, currency follows: `price_points` is what the backend
			// stores and charges; `price_display`/`currency` are its
			// server-derived rendering, reproduced here verbatim. Nothing on this
			// row is converted client-side — the rate lives on the server.
			render: row =>
				h("div", [
					// `usePoints()` needs setup scope; this builder is a plain function
					// given `t`, so it formats with the repo's own number formatter
					// rather than reaching for the composable outside a component.
					h("div", { class: "font-medium" }, `${formatNumber(row.price_points)} ${t("points.unit")}`),
					row.price_display && isCurrencyCode(row.currency)
						? h("div", { class: "text-secondary text-xs" }, `≈ ${formatCurrency(row.price_display, { currency: row.currency })}`)
						: null
				])
		},
		{
			title: t("packages.columns.balances"),
			key: "balances",
			render: row => {
				const count = row.balances?.length ?? 0
				return h(
					NTag,
					{ type: count > 0 ? "success" : "default", round: true, bordered: false, size: "small" },
					{ default: () => `${count} ${t("packages.columns.balances")}` }
				)
			}
		},
		{
			title: t("packages.columns.features"),
			key: "features",
			render: row => {
				const count = row.features?.length ?? 0
				return h(
					NTag,
					{ type: count > 0 ? "info" : "default", round: true, bordered: false, size: "small" },
					{ default: () => `${count} ${t("packages.columns.features")}` }
				)
			}
		},
		{
			title: t("packages.columns.discounts"),
			key: "discounts",
			render: row => {
				const discounts = row.discounts ?? []
				if (discounts.length === 0) {
					return h(
						NTag,
						{ type: "default", round: true, bordered: false, size: "small" },
						{ default: () => `0 ${t("packages.columns.discounts")}` }
					)
				}
				// Unique percentages, not a row count — an admin scanning the
				// table wants "30%", not "2 discounts" they then have to open
				// the drawer to decode.
				const percentages = [...new Set(discounts.map(d => d.percentage))].sort((a, b) => a - b)
				return h(
					NTag,
					{ type: "warning", round: true, bordered: false, size: "small" },
					{ default: () => percentages.map(p => `${p}%`).join(", ") }
				)
			}
		},
		{
			title: t("packages.columns.resources"),
			key: "resource_grants",
			render: row => {
				const grants = row.resource_grants ?? []
				if (grants.length === 0) {
					return h(
						NTag,
						{ type: "default", round: true, bordered: false, size: "small" },
						{ default: () => `0 ${t("packages.columns.resources")}` }
					)
				}
				// Same reasoning as the discounts column: an admin scanning the
				// table wants "100 page, 5 hour", not a bare count they then have
				// to open the drawer to decode.
				const summary = grants
					.map(g => `${formatNumber(g.quantity)} ${g.resource_type ? pickLocalized(g.resource_type.unit_label, locale) : ""}`.trim())
					.join(", ")
				return h(
					NTag,
					{ type: "info", round: true, bordered: false, size: "small" },
					{ default: () => summary }
				)
			}
		},
		{
			title: t("packages.columns.accessWindow"),
			key: "access_window_start",
			render: row =>
				row.access_window_start && row.access_window_end
					? h(
							NTag,
							{ type: "info", round: true, bordered: false, size: "small" },
							// Wall-clock strings straight from the server, never
							// reformatted: they are not instants, so a locale-aware
							// time formatter would be the wrong tool and a timezone
							// conversion would be actively wrong.
							//
							// Changed 2026-09-30: every time in the dashboard is now
							// 12-hour, and `formatClockTime` exists for exactly this
							// case — it re-spells the wall clock ("20:00" → "08:00 م")
							// with no Date and no timezone involved, so the reason
							// above still holds. Given up: the raw server string on
							// screen, which made a mismatch with the API easy to spot.
							{ default: () => `${formatClockTime(row.access_window_start ?? "")} – ${formatClockTime(row.access_window_end ?? "")}` }
						)
					: h("span", { class: "text-xs text-secondary" }, `— ${t("packages.anyTime")} —`)
		},
		{
			title: t("packages.columns.visibility"),
			key: "is_public",
			filterMultiple: false,
			filterOptions: [
				{ label: t("packages.visibility.public"), value: 1 },
				{ label: t("packages.visibility.private"), value: 0 }
			],
			filter: (value, row) => (value === 1 ? row.is_public : !row.is_public),
			render: row =>
				h(
					NTag,
					{ type: row.is_public ? "default" : "warning", round: true, bordered: true, size: "small" },
					{
						default: () => [
							h(Icon, { name: row.is_public ? "carbon:view" : "carbon:view-off", size: 14 }),
							` ${t(row.is_public ? "packages.visibility.public" : "packages.visibility.private")}`
						]
					}
				)
		},
		{ title: t("packages.columns.duration"), key: "duration_days", render: row => formatNumber(row.duration_days) },
		{
			title: t("packages.columns.isActive"),
			key: "is_active",
			filterMultiple: false,
			filterOptions: [
				{ label: t("packages.isActiveYes"), value: 1 },
				{ label: t("packages.isActiveNo"), value: 0 }
			],
			filter: (value, row) => (value === 1 ? row.is_active : !row.is_active),
			render: row =>
				h(
					NTag,
					{ type: row.is_active ? "success" : "error", round: true, bordered: true },
					{
						default: () => [
							h(Icon, { name: row.is_active ? STATUS_ICONS.success : STATUS_ICONS.danger, size: 14 }),
							` ${t(row.is_active ? "packages.isActiveYes" : "packages.isActiveNo")}`
						]
					}
				)
		}
	]
}

/**
 * A saved plan as the form edits it — every nested list copied, so editing
 * never touches the row the list shows. Shared by the plans list and the
 * plan editor page.
 */
export function planToPayload(row: Plan): PlanPayload {
	return {
	plan_module_id: row.plan_module_id ?? null,
	name: { ...row.name },
	subtitle: row.subtitle ? { ...row.subtitle } : { ar: "", en: "" },
	is_subscription: row.is_subscription,
	// Points in, points out: the form edits the same integer the backend
	// stores.
	price_points: row.price_points,
	reference_plan_id: row.reference_plan_id ?? null,
	reference_space_id: row.reference_space_id ?? null,
	reference_units: row.reference_units ?? null,
	duration_days: row.duration_days,
	// A plan saved before plans stated their coworking terms reads as none.
	coworking_seat: row.coworking_seat ?? "none",
	coworking_hours: row.coworking_hours != null ? Number(row.coworking_hours) : null,
	allowance_cycle: row.allowance_cycle ?? "period",
	// Wall-clock strings, copied across untouched — they are not instants,
	// so there is nothing here to parse, format or convert.
	access_window_start: row.access_window_start ?? null,
	access_window_end: row.access_window_end ?? null,
	is_active: row.is_active,
	// A plan saved before this column existed reads as undefined; treat that
	// as public, matching the backend column's own default.
	is_public: row.is_public ?? true,
	order: row.order,
	balances: (row.balances ?? []).map(b => ({
		category: b.category,
		amount_points: b.amount_points,
		restricted_space_id: b.restricted_space_id ?? null,
		description: b.description ? { ...b.description } : { ar: "", en: "" },
		order: b.order ?? 0
	})),
	features: (row.features ?? []).map(f => ({
		name: { ...f.name },
		value: f.value ? { ...f.value } : { ar: "", en: "" },
		icon: f.icon ?? "",
		is_included: f.is_included,
		order: f.order ?? 0
	})),
	discounts: (row.discounts ?? []).map(d => ({
		percentage: d.percentage,
		space_id: d.space_id ?? null,
		space_type: d.space_type ?? null,
		usage_limit: d.usage_limit ?? null,
		description: d.description ? { ...d.description } : { ar: "", en: "" },
		is_active: d.is_active,
		order: d.order ?? 0,
		targetMode: d.space_id != null ? "space" : d.space_type != null ? "space_type" : "all"
	})),
	space_hours: (row.space_hours ?? []).map(h => ({
		id: h.id,
		hours: Number(h.hours),
		space_id: h.space_id ?? null,
		space_type: h.space_type ?? null,
		description: h.description ? { ...h.description } : { ar: "", en: "" },
		order: h.order ?? 0,
		targetMode: h.space_id != null ? "space" : "space_type"
	})),
	resource_grants: (row.resource_grants ?? []).map(g => ({
		resource_type_id: g.resource_type_id,
		resource_type: g.resource_type ? { ...g.resource_type } : null,
		quantity: Number(g.quantity),
		description: g.description ? { ...g.description } : { ar: "", en: "" },
		order: g.order ?? 0
	}))
}
}

export function emptyPlanPayload(): PlanPayload {
	return {
		plan_module_id: null,
		name: { ar: "", en: "" },
		subtitle: { ar: "", en: "" },
		is_subscription: false,
		price_points: 0,
		reference_plan_id: null,
		reference_space_id: null,
		reference_units: null,
		duration_days: 30,
		coworking_seat: "flexible",
		coworking_hours: null,
		allowance_cycle: "period",
		access_window_start: null,
		access_window_end: null,
		is_active: true,
		is_public: true,
		order: 1,
		balances: [],
		features: [],
		discounts: [],
		space_hours: [],
		resource_grants: []
	}
}

export type PlanTemplateKey = "monthlyUnlimited" | "setHours" | "dedicatedDesk" | "noSeat"

/** The order the picker shows them in; nine plans in ten are the first. */
export const planTemplateKeys: PlanTemplateKey[] = ["monthlyUnlimited", "setHours", "dedicatedDesk", "noSeat"]

const noWindow = { access_window_start: null, access_window_end: null }

/** What each template sets: the shared-workspace terms, the length, and that it is sold as a subscription. */
export const planTemplates: Record<PlanTemplateKey, Partial<PlanPayload>> = {
	monthlyUnlimited: { coworking_seat: "flexible", coworking_hours: null, allowance_cycle: "period", ...noWindow, duration_days: 30, is_subscription: true },
	setHours: { coworking_seat: "flexible", coworking_hours: 20, allowance_cycle: "monthly", ...noWindow, duration_days: 30, is_subscription: true },
	dedicatedDesk: { coworking_seat: "dedicated", coworking_hours: null, allowance_cycle: "period", ...noWindow, duration_days: 30, is_subscription: true },
	noSeat: { coworking_seat: "none", coworking_hours: null, allowance_cycle: "period", ...noWindow, duration_days: 30, is_subscription: true }
}

/** The payload with a template's terms; the name, price, benefits and display settings stay as they are. */
export function applyTemplate(payload: PlanPayload, key: PlanTemplateKey): PlanPayload {
	return { ...payload, ...planTemplates[key] }
}
