import type { DataTableColumns } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { ContactLink, ContactLinkPayload } from "@/add-os/modules/cms/types/contact-link"
import { NTag } from "naive-ui"
import { h } from "vue"

export function buildContactLinkColumns(t: ComposerTranslation): DataTableColumns<ContactLink> {
	return [
		{
			title: t("contactLinks.columns.type"),
			key: "type",
			render: row => row.type
		},
		{
			title: t("contactLinks.columns.value"),
			key: "value",
			render: row => row.value
		},
		{
			title: t("contactLinks.columns.label"),
			key: "label",
			render: row => row.label || "—"
		},
		{
			title: t("contactLinks.columns.status"),
			key: "is_visible",
			render: row => h(
				NTag,
				{ type: row.is_visible ? "success" : "default", round: true, bordered: true },
				{ default: () => row.is_visible ? t("contactLinks.status.visible") : t("contactLinks.status.hidden") }
			)
		}
	]
}

export const contactLinkFields: FieldDescriptor<ContactLinkPayload>[] = [
	{ key: "type", labelKey: "contactLinks.form.type", type: "text", required: true },
	{ key: "value", labelKey: "contactLinks.form.value", type: "text", required: true },
	{ key: "label", labelKey: "contactLinks.form.label", type: "text" },
	{ key: "sort_order", labelKey: "contactLinks.form.sortOrder", type: "number" },
	{ key: "is_visible", labelKey: "contactLinks.form.isVisible", type: "switch" }
]

export function emptyContactLinkPayload(): ContactLinkPayload {
	return {
		type: "",
		value: "",
		label: "",
		sort_order: null,
		is_visible: true
	}
}
