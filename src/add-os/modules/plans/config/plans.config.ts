import type { DataTableColumns } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { SupportedLocale } from "@/add-os/lang/locales"
import type { Plan, PlanPayload } from "@/add-os/modules/plans/types/plan"
import { NTag } from "naive-ui"
import { h } from "vue"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { STATUS_ICONS } from "@/add-os/theme/tokens"
import { formatCurrency, formatNumber, isCurrencyCode } from "@/add-os/utils/format"
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
							{ default: () => `${row.access_window_start} – ${row.access_window_end}` }
						)
					: h("span", { class: "text-xs text-secondary" }, `— ${t("packages.anyTime")} —`)
		},
		{
			title: t("packages.columns.visibility"),
			key: "is_public",
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

export function emptyPlanPayload(): PlanPayload {
	return {
		plan_module_id: null,
		name: { ar: "", en: "" },
		subtitle: { ar: "", en: "" },
		is_subscription: false,
		price_points: 0,
		duration_days: 30,
		included_hours: 0,
		access_window_start: null,
		access_window_end: null,
		is_active: true,
		is_public: true,
		order: 1,
		balances: [],
		features: [],
		discounts: [],
		resource_grants: []
	}
}
