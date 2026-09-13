import type { DataTableColumns } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { SupportedLocale } from "@/add-os/lang/locales"
import type { CommunityMember, CommunityMemberPayload } from "@/add-os/modules/community/types/community-member"
import { NImage, NTag } from "naive-ui"
import { h } from "vue"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import Icon from "@/components/common/Icon.vue"

export function buildCommunityMemberColumns(
	t: ComposerTranslation,
	locale: SupportedLocale
): DataTableColumns<CommunityMember> {
	return [
		{
			title: t("communityMembers.columns.photo"),
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
			title: t("communityMembers.columns.name"),
			key: "name",
			render: row => pickLocalized(row.name, locale)
		},
		{
			title: t("communityMembers.columns.category"),
			key: "category",
			render: row => t(`communityMembers.categories.${row.category}`)
		},
		{
			title: t("communityMembers.columns.company"),
			key: "company",
			render: row => (row.company ? pickLocalized(row.company, locale) : "—")
		},
		{
			title: t("communityMembers.columns.title"),
			key: "title",
			render: row => (row.title ? pickLocalized(row.title, locale) : "—")
		},
		{
			title: t("communityMembers.columns.yearJoined"),
			key: "year_joined",
			render: row => (row.year_joined ? String(row.year_joined) : "—")
		},
		{
			title: t("communityMembers.columns.published"),
			key: "published",
			render: row =>
				h(
					NTag,
					{ type: row.published ? "success" : "default", round: true, bordered: true },
					{ default: () => (row.published ? t("communityMembers.status.published") : t("communityMembers.status.hidden")) }
				)
		}
	]
}

export const communityMemberFields: FieldDescriptor<CommunityMemberPayload>[] = [
	{ key: "name", labelKey: "communityMembers.form.name", type: "bilingual-text", required: true },
	{
		key: "category",
		labelKey: "communityMembers.form.category",
		type: "select",
		required: true,
		options: [
			{ label: "Pioneers", value: "pioneers" },
			{ label: "Growth Partners", value: "growth_partners" },
			{ label: "Investors", value: "investors" },
			{ label: "Impact Partners", value: "impact_partners" }
		]
	},
	{ key: "company", labelKey: "communityMembers.form.company", type: "bilingual-text" },
	{ key: "title", labelKey: "communityMembers.form.title", type: "bilingual-text" },
	{ key: "bio", labelKey: "communityMembers.form.bio", type: "bilingual-textarea" },
	{ key: "long_bio", labelKey: "communityMembers.form.longBio", type: "bilingual-textarea" },
	{ key: "year_joined", labelKey: "communityMembers.form.yearJoined", type: "number" },
	{ key: "photo_url", labelKey: "communityMembers.form.photoUrl", type: "image", folder: "community" },
	{ key: "order", labelKey: "communityMembers.form.order", type: "number" },
	{ key: "published", labelKey: "communityMembers.form.published", type: "switch" }
]

export function emptyCommunityMemberPayload(): CommunityMemberPayload {
	return {
		name: { ar: "", en: "" },
		category: "pioneers",
		company: { ar: "", en: "" },
		title: { ar: "", en: "" },
		bio: { ar: "", en: "" },
		long_bio: { ar: "", en: "" },
		year_joined: new Date().getFullYear(),
		photo_url: "",
		order: 0,
		published: true
	}
}
