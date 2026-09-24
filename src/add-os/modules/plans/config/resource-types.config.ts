import type { DataTableColumns } from "naive-ui"
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

export const resourceTypeFields: FieldDescriptor<ResourceTypePayload>[] = [
	{ key: "name", labelKey: "packages.form.name", type: "bilingual-text", required: true },
	{ key: "slug", labelKey: "packages.resourceTypes.form.slug", type: "text" },
	{ key: "unit_label", labelKey: "packages.resourceTypes.form.unitLabel", type: "bilingual-text", required: true },
	{ key: "icon", labelKey: "packages.resourceTypes.form.icon", type: "text" },
	{ key: "order", labelKey: "packages.form.order", type: "number" },
	{ key: "is_active", labelKey: "packages.form.isActive", type: "switch" }
]

export function emptyResourceTypePayload(): ResourceTypePayload {
	return {
		name: { ar: "", en: "" },
		slug: "",
		unit_label: { ar: "", en: "" },
		icon: "",
		order: 1,
		is_active: true
	}
}
