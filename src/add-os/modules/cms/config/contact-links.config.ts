import type { DataTableColumns } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { ContactLink, ContactLinkPayload } from "@/add-os/modules/cms/types/contact-link"
import { NTag } from "naive-ui"
import { h } from "vue"

/**
 * The types the app knows how to draw — an icon each, and what tapping opens
 * (a mail, a call, a WhatsApp chat, a map, a link): the backend builds the
 * `url` from the type (ContactLink::url()).
 */
export const CONTACT_LINK_TYPES = ["email", "phone", "mobile", "whatsapp", "telegram", "address", "website", "instagram", "facebook", "linkedin"] as const

/** A known type's label, or the stored value for one entered before the list existed. */
function typeLabel(t: ComposerTranslation, type: string): string {
	return (CONTACT_LINK_TYPES as readonly string[]).includes(type) ? t(`contactLinks.types.${type}`) : type
}

export function buildContactLinkColumns(t: ComposerTranslation): DataTableColumns<ContactLink> {
	return [
		{
			title: t("contactLinks.columns.type"),
			key: "type",
			render: row => typeLabel(t, row.type)
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

export function buildContactLinkFields(t: ComposerTranslation): FieldDescriptor<ContactLinkPayload>[] {
	return [
		{
			key: "type",
			labelKey: "contactLinks.form.type",
			type: "select",
			required: true,
			options: CONTACT_LINK_TYPES.map(type => ({ label: typeLabel(t, type), value: type }))
		},
		{ key: "value", labelKey: "contactLinks.form.value", type: "text", required: true },
		{ key: "label", labelKey: "contactLinks.form.label", type: "text" },
		{ key: "sort_order", labelKey: "contactLinks.form.sortOrder", type: "number" },
		{ key: "is_visible", labelKey: "contactLinks.form.isVisible", type: "switch" }
	]
}

export function emptyContactLinkPayload(): ContactLinkPayload {
	return {
		type: "",
		value: "",
		label: "",
		sort_order: null,
		is_visible: true
	}
}
