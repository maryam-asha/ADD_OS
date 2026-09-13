import type { DataTableColumns } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { SupportedLocale } from "@/add-os/lang/locales"
import type { EventCategory, EventCategoryPayload } from "@/add-os/modules/events/types/event-category"
import { NTag } from "naive-ui"
import { h } from "vue"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { formatNumber } from "@/add-os/utils/format"

export function buildEventCategoryColumns(
	t: ComposerTranslation,
	locale: SupportedLocale
): DataTableColumns<EventCategory> {
	return [
		{
			title: t("eventCategories.columns.name"),
			key: "name",
			render: row => pickLocalized(row.name, locale)
		},
		{
			title: t("eventCategories.columns.color"),
			key: "color",
			render: row =>
				row.color
					? h("div", { class: "flex items-center gap-2" }, [
							h("span", {
								class: "inline-block w-3.5 h-3.5 rounded-full border border-black/10 shadow-sm",
								style: { backgroundColor: row.color }
							}),
							h("span", { class: "font-mono text-xs text-muted" }, row.color)
						])
					: "—"
		},
		{
			title: t("eventCategories.columns.order"),
			key: "order",
			render: row => formatNumber(row.order)
		},
		{
			title: t("eventCategories.columns.status"),
			key: "is_active",
			render: row =>
				h(
					NTag,
					{ type: row.is_active ? "success" : "default", round: true, bordered: true },
					{
						default: () =>
							row.is_active ? t("eventCategories.status.active") : t("eventCategories.status.inactive")
					}
				)
		}
	]
}

export const eventCategoryFields: FieldDescriptor<EventCategoryPayload>[] = [
	{ key: "name", labelKey: "eventCategories.form.name", type: "bilingual-text", required: true },
	{ key: "description", labelKey: "eventCategories.form.description", type: "bilingual-textarea" },
	{ key: "color", labelKey: "eventCategories.form.color", type: "color" },
	{ key: "icon", labelKey: "eventCategories.form.icon", type: "text" },
	{ key: "order", labelKey: "eventCategories.form.order", type: "number" },
	{ key: "is_active", labelKey: "eventCategories.form.isActive", type: "switch" }
]

export function emptyEventCategoryPayload(): EventCategoryPayload {
	return {
		name: { ar: "", en: "" },
		description: { ar: "", en: "" },
		color: "#3B82F6",
		icon: "",
		order: 0,
		is_active: true
	}
}
