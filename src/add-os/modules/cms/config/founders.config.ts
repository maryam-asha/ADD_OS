import type { DataTableColumns } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { SupportedLocale } from "@/add-os/lang/locales"
import type { Founder, FounderPayload } from "@/add-os/modules/cms/types/founder"
import { NImage } from "naive-ui"
import { h } from "vue"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import Icon from "@/components/common/Icon.vue"

export function buildFounderColumns(t: ComposerTranslation, locale: SupportedLocale): DataTableColumns<Founder> {
	return [
		{
			title: t("founders.columns.photo"),
			key: "photo_url",
			width: 70,
			render: row =>
				row.photo_url
					? h(NImage, {
							width: 44,
							height: 44,
							src: row.photo_url,
							class: "rounded-lg overflow-hidden flex items-center justify-center",
							imgProps: {
								class: "rounded-lg object-cover w-11 h-11 border border-black/10 shadow-2xs"
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
			title: t("founders.columns.name"),
			key: "name",
			render: row => pickLocalized(row.name, locale)
		},
		{
			title: t("founders.columns.role"),
			key: "role",
			render: row => row.role ? pickLocalized(row.role, locale) : "—"
		},
		{
			title: t("founders.columns.linkedin"),
			key: "linkedin_url",
			render: row => row.linkedin_url || "—"
		},
		{
			title: t("founders.columns.order"),
			key: "order",
			render: row => String(row.order)
		}
	]
}

export const founderFields: FieldDescriptor<FounderPayload>[] = [
	{ key: "name", labelKey: "founders.form.name", type: "bilingual-text", required: true },
	{ key: "role", labelKey: "founders.form.role", type: "bilingual-text" },
	{ key: "bio", labelKey: "founders.form.bio", type: "bilingual-textarea" },
	{ key: "photo_url", labelKey: "founders.form.photoUrl", type: "image", folder: "founders" },
	{ key: "linkedin_url", labelKey: "founders.form.linkedinUrl", type: "text" },
	{ key: "twitter_url", labelKey: "founders.form.twitterUrl", type: "text" },
	{ key: "order", labelKey: "founders.form.order", type: "number" }
]

export function emptyFounderPayload(): FounderPayload {
	return {
		name: { ar: "", en: "" },
		role: { ar: "", en: "" },
		bio: { ar: "", en: "" },
		photo_url: "",
		linkedin_url: "",
		twitter_url: "",
		order: null
	}
}
