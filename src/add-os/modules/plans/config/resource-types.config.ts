import type { DataTableColumns, SelectOption } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { SupportedLocale } from "@/add-os/lang/locales"
import type { ResourceType, ResourceTypePayload } from "@/add-os/modules/plans/types/resource-type"
import { NTag } from "naive-ui"
import { h } from "vue"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { STATUS_ICONS } from "@/add-os/theme/tokens"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

export function buildResourceTypeColumns(t: ComposerTranslation, locale: SupportedLocale): DataTableColumns<ResourceType> {
	return [
		{
			title: t("packages.columns.name"),
			key: "name",
			render: row => pickLocalized(row.name, locale)
		},
		{
			title: t("packages.resourceTypes.columns.slug"),
			key: "slug"
		},
		{
			title: t("packages.resourceTypes.columns.unitLabel"),
			key: "unit_label",
			render: row => pickLocalized(row.unit_label, locale)
		},
		{
			title: t("packages.form.order"),
			key: "order",
			render: row => formatNumber(row.order)
		},
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
 * `stockItems` are the inventory's stock items: a type may name the one it
 * uses up (printing: paper), so recording consumption at reception issues
 * `stock_units_per_unit` of it per unit — ADD Core refuses the consumption
 * when the shelf cannot cover it.
 */
export function buildResourceTypeFields(stockItems: SelectOption[]): FieldDescriptor<ResourceTypePayload>[] {
	return [
		{ key: "name", labelKey: "packages.form.name", type: "bilingual-text", required: true },
		{ key: "slug", labelKey: "packages.resourceTypes.form.slug", type: "text" },
		{ key: "unit_label", labelKey: "packages.resourceTypes.form.unitLabel", type: "bilingual-text", required: true },
		{ key: "icon", labelKey: "packages.resourceTypes.form.icon", type: "text" },
		{ key: "inventory_item_id", labelKey: "packages.resourceTypes.form.stockItem", type: "select", options: stockItems },
		{
			key: "stock_units_per_unit",
			labelKey: "packages.resourceTypes.form.stockUnitsPerUnit",
			type: "number",
			min: 0.001,
			step: 0.5,
			hiddenWhen: model => !model.inventory_item_id
		},
		{ key: "order", labelKey: "packages.form.order", type: "number" },
		{ key: "is_active", labelKey: "packages.form.isActive", type: "switch" }
	]
}

export function emptyResourceTypePayload(): ResourceTypePayload {
	return {
		name: { ar: "", en: "" },
		slug: "",
		unit_label: { ar: "", en: "" },
		icon: "",
		inventory_item_id: null,
		stock_units_per_unit: 1,
		order: 1,
		is_active: true
	}
}
