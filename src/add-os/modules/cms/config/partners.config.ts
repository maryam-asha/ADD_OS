import type { DataTableColumns } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { SupportedLocale } from "@/add-os/lang/locales"
import type { Partner, PartnerPayload } from "@/add-os/modules/cms/types/partner"
import { NImage, NTag } from "naive-ui"
import { h } from "vue"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import Icon from "@/components/common/Icon.vue"

export function buildPartnerColumns(t: ComposerTranslation, locale: SupportedLocale): DataTableColumns<Partner> {
	return [
		{
			title: t("partners.columns.logo"),
			key: "logo_url",
			width: 70,
			render: row =>
				row.logo_url
					? h(NImage, {
							width: 44,
							height: 44,
							src: row.logo_url,
							class: "rounded-lg overflow-hidden flex items-center justify-center",
							imgProps: {
								class: "rounded-lg object-contain w-11 h-11 p-1 border border-black/10 shadow-2xs bg-white dark:bg-neutral-900"
							}
						})
					: h(
							"div",
							{
								class:
									"w-11 h-11 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 border border-black/5"
							},
							[h(Icon, { name: "carbon:image", size: 18 })]
						)
		},
		{
			title: t("partners.columns.name"),
			key: "name",
			render: row => pickLocalized(row.name, locale)
		},
		{
			title: t("partners.columns.category"),
			key: "category",
			render: row => t(`partners.category.${row.category}`)
		},
		{
			title: t("partners.columns.websiteUrl"),
			key: "website_url",
			render: row => row.website_url || "—"
		},
		{
			title: t("partners.columns.status"),
			key: "is_active",
			render: row => h(
				NTag,
				{ type: row.is_active ? "success" : "default", round: true, bordered: true },
				{ default: () => row.is_active ? t("partners.status.active") : t("partners.status.inactive") }
			)
		}
	]
}

export const partnerFields: FieldDescriptor<PartnerPayload>[] = [
	{ key: "name", labelKey: "partners.form.name", type: "bilingual-text", required: true },
	{ key: "description", labelKey: "partners.form.description", type: "bilingual-textarea" },
	{ key: "logo_url", labelKey: "partners.form.logoUrl", type: "image", folder: "partners" },
	{ key: "website_url", labelKey: "partners.form.websiteUrl", type: "text" },
	{
		key: "category",
		labelKey: "partners.form.category",
		type: "select",
		required: true,
		options: [
			{ label: "Local", value: "local" },
			{ label: "Global", value: "global" }
		]
	},
	{ key: "order", labelKey: "partners.form.order", type: "number" },
	{ key: "is_active", labelKey: "partners.form.isActive", type: "switch" }
]

export function emptyPartnerPayload(): PartnerPayload {
	return {
		name: { ar: "", en: "" },
		description: { ar: "", en: "" },
		logo_url: "",
		website_url: "",
		category: "local",
		order: null,
		is_active: true
	}
}
