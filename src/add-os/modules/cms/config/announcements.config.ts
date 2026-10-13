import type { DataTableColumns } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { Announcement, AnnouncementOptions, AnnouncementPayload } from "@/add-os/modules/cms/types/announcement"
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
			render: row => row.type_label
		},
		{
			title: t("announcements.columns.placement"),
			key: "placement",
			render: row => t(`announcements.placement.${row.placement}`)
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

/**
 * The type and placement pickers come from GET announcements/options, so the
 * labels are the server's and a new type needs no change here.
 */
export function buildAnnouncementFields(options: AnnouncementOptions | null): FieldDescriptor<AnnouncementPayload>[] {
	return [
		{
			key: "type",
			labelKey: "announcements.form.type",
			type: "select",
			required: true,
			options: (options?.types ?? []).map(type => ({ label: type.label, value: type.key }))
		},
		{
			key: "placement",
			labelKey: "announcements.form.placement",
			type: "select",
			required: true,
			options: (options?.placements ?? []).map(placement => ({ label: placement.label, value: placement.key }))
		},
		{ key: "image_url", labelKey: "announcements.form.imageUrl", type: "image", folder: "announcements" },
		{ key: "subtitle", labelKey: "announcements.form.subtitle", type: "bilingual-text" },
		{ key: "title", labelKey: "announcements.form.title", type: "bilingual-text" },
		{ key: "description", labelKey: "announcements.form.description", type: "bilingual-textarea" },
		{ key: "cta_label", labelKey: "announcements.form.ctaLabel", type: "bilingual-text" },
		{ key: "link_url", labelKey: "announcements.form.linkUrl", type: "text" },
		{ key: "starts_at", labelKey: "announcements.form.startsAt", type: "datetime" },
		{ key: "ends_at", labelKey: "announcements.form.endsAt", type: "datetime" },
		{ key: "sort_order", labelKey: "announcements.form.sortOrder", type: "number" },
		{ key: "is_active", labelKey: "announcements.form.isActive", type: "switch" }
	]
}

export function emptyAnnouncementPayload(): AnnouncementPayload {
	return {
		type: null,
		placement: "all",
		subtitle: { ar: "", en: "" },
		title: { ar: "", en: "" },
		description: { ar: "", en: "" },
		cta_label: { ar: "", en: "" },
		image_url: "",
		link_url: "",
		sort_order: null,
		starts_at: "",
		ends_at: "",
		is_active: true
	}
}

/** The edit form's starting values: text the server has none of is blank, not null. */
export function announcementToPayload(row: Announcement): AnnouncementPayload {
	return {
		type: row.type,
		placement: row.placement,
		subtitle: row.subtitle ? { ...row.subtitle } : { ar: "", en: "" },
		title: row.title ? { ...row.title } : { ar: "", en: "" },
		description: row.description ? { ...row.description } : { ar: "", en: "" },
		cta_label: row.cta_label ? { ...row.cta_label } : { ar: "", en: "" },
		image_url: row.image_url || "",
		link_url: row.link_url || "",
		sort_order: row.sort_order,
		starts_at: row.starts_at || "",
		ends_at: row.ends_at || "",
		is_active: row.is_active
	}
}

/** Text left blank in both languages goes out as null: an image-only banner. */
export function announcementBody(payload: Record<string, unknown>): Record<string, unknown> {
	const body = { ...payload }
	for (const key of ["subtitle", "title", "description", "cta_label"]) {
		const value = body[key] as { ar: string; en: string } | null
		body[key] = value && (value.ar.trim() || value.en.trim()) ? value : null
	}
	return body
}
