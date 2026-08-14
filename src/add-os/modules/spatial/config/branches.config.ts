import type { DataTableColumns } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { SupportedLocale } from "@/add-os/lang/locales"
import type { Branch, BranchPayload } from "@/add-os/modules/spatial/types/branch"
import { NTag } from "naive-ui"
import { h } from "vue"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { STATUS_ICONS } from "@/add-os/theme/tokens"
import Icon from "@/components/common/Icon.vue"

export function buildBranchColumns(t: ComposerTranslation, locale: SupportedLocale): DataTableColumns<Branch> {
	return [
		{ title: t("branches.columns.name"), key: "name", render: row => pickLocalized(row.name, locale) },
		{ title: t("branches.columns.city"), key: "city", render: row => pickLocalized(row.city, locale) },
		{ title: t("branches.columns.timezone"), key: "timezone" },
		{
			title: t("branches.columns.isActive"),
			key: "is_active",
			render: row =>
				h(
					NTag,
					{ type: row.is_active ? "success" : "error", round: true, bordered: true },
					{
						default: () => [
							h(Icon, { name: row.is_active ? STATUS_ICONS.success : STATUS_ICONS.danger, size: 14 }),
							` ${t(row.is_active ? "branches.isActiveYes" : "branches.isActiveNo")}`
						]
					}
				)
		}
	]
}

export const branchFields: FieldDescriptor<BranchPayload>[] = [
	{ key: "name", labelKey: "branches.form.name", type: "bilingual-text", required: true },
	{ key: "city", labelKey: "branches.form.city", type: "bilingual-text", required: true },
	{ key: "timezone", labelKey: "branches.form.timezone", type: "text", required: true },
	{ key: "is_active", labelKey: "branches.form.isActive", type: "switch" }
]

export function emptyBranchPayload(): BranchPayload {
	return { name: { ar: "", en: "" }, city: { ar: "", en: "" }, timezone: "Asia/Damascus", is_active: true }
}
