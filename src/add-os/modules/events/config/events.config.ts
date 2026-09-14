import type { DataTableColumns } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { SupportedLocale } from "@/add-os/lang/locales"
import type { Event, EventPayload, EventStatus } from "@/add-os/modules/events/types/event"
import type { EventCategory } from "@/add-os/modules/events/types/event-category"
import { NImage, NTag } from "naive-ui"
import { h } from "vue"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

const STATUS_TAG_TYPE: Record<EventStatus, "default" | "success" | "error"> = {
	draft: "default",
	published: "success",
	cancelled: "error"
}

export function buildEventColumns(t: ComposerTranslation, locale: SupportedLocale): DataTableColumns<Event> {
	return [
		{
			title: t("events.columns.image"),
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
			title: t("events.columns.title"),
			key: "title",
			render: row => pickLocalized(row.title, locale)
		},
		{
			title: t("events.columns.category"),
			key: "category",
			render: row => (row.category ? pickLocalized(row.category.name, locale) : "—")
		},
		{
			title: t("events.columns.startAt"),
			key: "start_at",
			render: row => (row.start_at ? row.start_at.replace("T", " ").substring(0, 16) : "—")
		},
		{
			title: t("events.columns.location"),
			key: "location",
			render: row => row.location || "—"
		},
		{
			title: t("events.columns.capacity"),
			key: "capacity",
			render: row => (row.capacity ? formatNumber(row.capacity) : "—")
		},
		{
			title: t("events.columns.price"),
			key: "price_points",
			render: row =>
				row.is_free || !row.price_points
					? h(
							NTag,
							{ type: "success", round: true, bordered: false, size: "small" },
							{ default: () => t("events.free") }
						)
					: h(
							"span",
							{ class: "font-semibold add-numeric text-neutral-800" },
							`${formatNumber(row.price_points)} ${t("points.unit")}`
						)
		},
		{
			title: t("events.columns.status"),
			key: "status",
			render: row =>
				h(
					NTag,
					{ type: STATUS_TAG_TYPE[row.status] ?? "default", round: true, bordered: true },
					{ default: () => t(`events.status.${row.status}`) }
				)
		}
	]
}

export function buildEventFields(
	categories: EventCategory[] = [],
	locale: SupportedLocale = "en"
): FieldDescriptor<EventPayload>[] {
	const categoryOptions = categories.map(cat => ({
		label: pickLocalized(cat.name, locale),
		value: cat.id
	}))

	return [
		{ key: "title", labelKey: "events.form.title", type: "bilingual-text", required: true },
		{ key: "description", labelKey: "events.form.description", type: "bilingual-textarea" },
		{ key: "category_id", labelKey: "events.form.category", type: "select", options: categoryOptions },
		{ key: "start_at", labelKey: "events.form.startAt", type: "datetime", required: true },
		{ key: "end_at", labelKey: "events.form.endAt", type: "datetime", required: true },
		{ key: "location", labelKey: "events.form.location", type: "text" },
		{ key: "capacity", labelKey: "events.form.capacity", type: "number" },
		{ key: "is_free", labelKey: "events.form.isFree", type: "switch" },
		{
			// Points are the price. There is no currency selector any more —
			// the currency figures are derived by the backend at read time.
			key: "price_points",
			labelKey: "events.form.pricePoints",
			type: "number",
			hiddenWhen: model => Boolean((model as EventPayload).is_free)
		},
		{ key: "image_url", labelKey: "events.form.imageUrl", type: "image", folder: "events" },
		{
			key: "status",
			labelKey: "events.form.status",
			type: "select",
			required: true,
			options: [
				{ label: "Draft", value: "draft" },
				{ label: "Published", value: "published" },
				{ label: "Cancelled", value: "cancelled" }
			]
		},
		{ key: "order", labelKey: "events.form.order", type: "number" }
	]
}

export const eventFields: FieldDescriptor<EventPayload>[] = buildEventFields([], "en")

export function emptyEventPayload(): EventPayload {
	const now = new Date()
	const twoHoursLater = new Date(now.getTime() + 2 * 3600 * 1000)
	const formatDt = (d: Date) => {
		const year = d.getFullYear()
		const month = String(d.getMonth() + 1).padStart(2, "0")
		const day = String(d.getDate()).padStart(2, "0")
		const hours = String(d.getHours()).padStart(2, "0")
		const minutes = String(d.getMinutes()).padStart(2, "0")
		const seconds = String(d.getSeconds()).padStart(2, "0")
		return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
	}

	return {
		category_id: null,
		title: { ar: "", en: "" },
		description: { ar: "", en: "" },
		start_at: formatDt(now),
		end_at: formatDt(twoHoursLater),
		location: "",
		capacity: null,
		is_free: true,
		price_points: 0,
		image_url: "",
		status: "draft",
		order: 0
	}
}
