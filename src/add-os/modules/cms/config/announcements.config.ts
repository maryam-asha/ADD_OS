import type { DataTableColumns } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { Announcement, AnnouncementPayload } from "@/add-os/modules/cms/types/announcement"
import { NImage, NTag } from "naive-ui"
import { h } from "vue"
import Icon from "@/components/common/Icon.vue"

export function buildAnnouncementColumns(t: ComposerTranslation): DataTableColumns<Announcement> {
	return [
		{
			title: t("announcements.columns.image"),
			key: "image_url",
			width: 70,
			render: row =>
				row.image_url
					? h(NImage, {
							width: 44,
							height: 44,
							src: row.image_url,
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
			title: t("announcements.columns.type"),
			key: "type",
			render: row => row.type
		},
		{
			title: t("announcements.columns.startsAt"),
			key: "starts_at",
			render: row => row.starts_at ? row.starts_at.substring(0, 10) : "—"
		},
		{
			title: t("announcements.columns.endsAt"),
			key: "ends_at",
			render: row => row.ends_at ? row.ends_at.substring(0, 10) : "—"
		},
		{
			title: t("announcements.columns.status"),
			key: "is_active",
			render: row => h(
				NTag,
				{ type: row.is_active ? "success" : "default", round: true, bordered: true },
				{ default: () => row.is_active ? t("announcements.status.active") : t("announcements.status.inactive") }
			)
		}
	]
}

export const announcementFields: FieldDescriptor<AnnouncementPayload>[] = [
	{ key: "type", labelKey: "announcements.form.type", type: "text", required: true },
	{ key: "image_url", labelKey: "announcements.form.imageUrl", type: "image", folder: "announcements" },
	{ key: "link_url", labelKey: "announcements.form.linkUrl", type: "text" },
	{ key: "starts_at", labelKey: "announcements.form.startsAt", type: "datetime" },
	{ key: "ends_at", labelKey: "announcements.form.endsAt", type: "datetime" },
	{ key: "sort_order", labelKey: "announcements.form.sortOrder", type: "number" },
	{ key: "is_active", labelKey: "announcements.form.isActive", type: "switch" }
]

export function emptyAnnouncementPayload(): AnnouncementPayload {
	return {
		type: "",
		image_url: "",
		link_url: "",
		sort_order: null,
		starts_at: "",
		ends_at: "",
		is_active: true
	}
}
