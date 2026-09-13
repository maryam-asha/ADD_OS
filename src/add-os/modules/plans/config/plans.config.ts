import type { DataTableColumns } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { SupportedLocale } from "@/add-os/lang/locales"
import type { Plan, PlanPayload } from "@/add-os/modules/plans/types/plan"
import { NTag } from "naive-ui"
import { h } from "vue"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { STATUS_ICONS } from "@/add-os/theme/tokens"
import { formatCurrency, formatNumber } from "@/add-os/utils/format"
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
			key: "price",
			render: row =>
				h("div", [
					h("div", formatCurrency(row.price, { currency: row.pricing_currency })),
					row.converted_amount && row.converted_currency
						? h("div", { class: "text-secondary text-xs" }, `≈ ${formatCurrency(row.converted_amount, { currency: row.converted_currency })}`)
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
		price: 0,
		pricing_currency: "USD",
		duration_days: 30,
		included_hours: 0,
		overage_rate: 0,
		is_active: true,
		order: 1,
		balances: [],
		features: []
	}
}
