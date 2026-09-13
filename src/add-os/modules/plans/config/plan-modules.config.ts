import type { DataTableColumns } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { SupportedLocale } from "@/add-os/lang/locales"
import type { PlanModule, PlanModulePayload } from "@/add-os/modules/plans/types/plan-module"
import { NTag } from "naive-ui"
import { h } from "vue"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { STATUS_ICONS } from "@/add-os/theme/tokens"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

export function buildPlanModuleColumns(t: ComposerTranslation, locale: SupportedLocale): DataTableColumns<PlanModule> {
	return [
		{
			title: t("packages.columns.name"),
			key: "name",
			render: row => pickLocalized(row.name, locale)
		},
		{
			title: t("packages.modules.columns.slug"),
			key: "slug"
		},
		{
			title: t("packages.modules.columns.plansCount"),
			key: "plans_count",
			render: row => formatNumber(row.plans_count ?? 0)
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

export const planModuleFields: FieldDescriptor<PlanModulePayload>[] = [
	{ key: "name", labelKey: "packages.form.name", type: "bilingual-text", required: true },
	{ key: "slug", labelKey: "packages.modules.form.slug", type: "text" },
	{ key: "icon", labelKey: "packages.modules.form.icon", type: "text" },
	{ key: "description", labelKey: "packages.modules.form.description", type: "bilingual-textarea" },
	{ key: "order", labelKey: "packages.form.order", type: "number" },
	{ key: "is_active", labelKey: "packages.form.isActive", type: "switch" }
]

export function emptyPlanModulePayload(): PlanModulePayload {
	return {
		name: { ar: "", en: "" },
		slug: "",
		icon: "",
		description: { ar: "", en: "" },
		order: 1,
		is_active: true
	}
}
