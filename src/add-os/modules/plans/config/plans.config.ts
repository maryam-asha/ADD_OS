import type { DataTableColumns } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
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
		{ title: t("packages.columns.name"), key: "name", render: row => pickLocalized(row.name, locale) },
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
						? h("div", { class: "text-gray-400 text-xs" }, `≈ ${formatCurrency(row.converted_amount, { currency: row.converted_currency })}`)
						: null
				])
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

/**
 * `pricing_currency` accepts "USD" and "SYP" only (confirmed live — "EUR" was rejected
 * as 422 invalid). Plain codes, not translated labels: a currency code isn't a phrase.
 */
export const planFields: FieldDescriptor<PlanPayload>[] = [
	{ key: "name", labelKey: "packages.form.name", type: "bilingual-text", required: true },
	{ key: "is_subscription", labelKey: "packages.form.isSubscription", type: "switch" },
	{ key: "price", labelKey: "packages.form.price", type: "number", required: true },
	{
		key: "pricing_currency",
		labelKey: "packages.form.pricingCurrency",
		type: "select",
		required: true,
		options: [
			{ label: "USD", value: "USD" },
			{ label: "SYP", value: "SYP" }
		]
	},
	{ key: "duration_days", labelKey: "packages.form.durationDays", type: "number", required: true },
	{ key: "included_hours", labelKey: "packages.form.includedHours", type: "number", required: true },
	{ key: "overage_rate", labelKey: "packages.form.overageRate", type: "number" },
	{ key: "is_active", labelKey: "packages.form.isActive", type: "switch" },
	{ key: "order", labelKey: "packages.form.order", type: "number" }
]

export function emptyPlanPayload(): PlanPayload {
	return {
		name: { ar: "", en: "" },
		is_subscription: false,
		price: 0,
		pricing_currency: "USD",
		duration_days: 30,
		included_hours: 0,
		overage_rate: 0,
		is_active: true,
		order: 1
	}
}
