import type { DataTableColumns, FormItemRule } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { SupportedLocale } from "@/add-os/lang/locales"
import type { Event, EventPayload, EventStatus } from "@/add-os/modules/events/types/event"
import type { EventCategory } from "@/add-os/modules/events/types/event-category"
import { NImage, NTag } from "naive-ui"
import { h } from "vue"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { formatDate, formatDateTime, formatNumber, toOffsetIso } from "@/add-os/utils/format"
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
			// The admin API sends true instants with an offset.
			// formatDateTime reads the browser clock — staff on-site see the
			// right wall-clock time automatically.
			render(row) {
				if (!row.start_at) return h("span", {}, "—")

				const start = formatDateTime(row.start_at, { locale })

				// Same calendar day → show start only (avoids "10 Sep, start → 10 Sep, end")
				const sameDay
					= row.end_at
					&& formatDate(row.start_at, { locale, style: "iso" }) === formatDate(row.end_at, { locale, style: "iso" })

				if (sameDay || !row.end_at) {
					return h("span", { class: "tabular-nums whitespace-nowrap" }, start)
				}

				const end = formatDate(row.end_at, { locale, style: "dateTime" })
				return h("span", { class: "tabular-nums whitespace-nowrap" }, `${start} → ${end}`)
			}
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
			title: t("events.columns.requiresApproval"),
			key: "requires_approval",
			width: 110,
			render: row =>
				row.requires_approval
					? h(
							NTag,
							{ type: "warning", round: true, bordered: false, size: "small" },
							{ default: () => t("events.approval.pending") }
						)
					: "—"
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
							// Already localised by the backend — no formatting here.
							row.price_label
						)
		},
		{
			title: t("events.columns.status"),
			key: "status",
			render: row =>
				h("div", { class: "flex items-center gap-1" }, [
					h(
						NTag,
						{ type: STATUS_TAG_TYPE[row.status] ?? "default", round: true, bordered: true },
						{ default: () => t(`events.status.${row.status}`) }
					),
					row.is_marked_full
						? h(NTag, { type: "error", round: true, bordered: false, size: "small" }, { default: () => t("events.markedFull") })
						: null
				])
		}
	]
}

/** Whether a value is an absolute http(s) link — what the backend's `url` rule accepts. */
function isHttpUrl(value: string): boolean {
	try {
		const url = new URL(value)
		return url.protocol === "http:" || url.protocol === "https:"
	} catch {
		return false
	}
}

const isExternal = (model: EventPayload) => model.registration_source === "external"

export function buildEventFields(
	categories: EventCategory[] = [],
	locale: SupportedLocale = "en",
	t?: ComposerTranslation
): FieldDescriptor<EventPayload>[] {
	// Option labels and rule messages are resolved here, not by the drawer;
	// without a translator (the static `eventFields` below) keys stand in.
	const tr = (key: string): string => (t ? t(key) : key)

	const categoryOptions = categories.map(cat => ({
		label: pickLocalized(cat.name, locale),
		value: cat.id
	}))

	// Only ever evaluated while the field is shown — i.e. "external" is
	// chosen — so an empty link stops the save instead of quietly saving an
	// in-app event the admin did not pick.
	const externalUrlRule: FormItemRule = {
		required: true,
		trigger: ["blur", "input"],
		validator: (_rule, value) => {
			const link = typeof value === "string" ? value.trim() : ""
			if (!link) return new Error(tr("events.validation.externalFormUrlRequired"))
			return isHttpUrl(link) || new Error(tr("events.validation.externalFormUrlInvalid"))
		}
	}

	return [
		{ key: "title", labelKey: "events.form.title", type: "bilingual-text", required: true },
		{ key: "description", labelKey: "events.form.description", type: "bilingual-textarea" },
		{ key: "category_id", labelKey: "events.form.category", type: "select", options: categoryOptions },
		// The schedule replaces a single start/end pair. An event whose hours
		// differ per day cannot be described by two pickers, and the event's
		// own start_at/end_at are derived from these by the backend — so they
		// are not entered here at all.
		{ key: "sessions", labelKey: "events.form.schedule", type: "sessions", required: true },
		{ key: "location", labelKey: "events.form.location", type: "text" },
		// Asked first, because it decides which of the fields below apply.
		{
			key: "registration_source",
			labelKey: "events.form.registrationSource",
			type: "select",
			required: true,
			virtual: true,
			options: [
				{ label: tr("events.form.registrationSourceInternal"), value: "internal" },
				{ label: tr("events.form.registrationSourceExternal"), value: "external" }
			]
		},
		// Registration happens here or on someone else's form, never both —
		// the backend refuses in-app registration once this is set, so seats,
		// approval and points stop applying to the event entirely.
		{
			key: "external_form_url",
			labelKey: "events.form.externalFormUrl",
			type: "text",
			rule: externalUrlRule,
			hiddenWhen: model => !isExternal(model as EventPayload)
		},
		{
			key: "capacity",
			labelKey: "events.form.capacity",
			type: "number",
			hiddenWhen: model => isExternal(model as EventPayload)
		},
		// A pending registration still holds a seat, so this interacts with
		// capacity above rather than standing on its own.
		{
			key: "requires_approval",
			labelKey: "events.form.requiresApproval",
			type: "switch",
			hiddenWhen: model => isExternal(model as EventPayload)
		},
		// The registration window. Left empty it opens on publication and
		// closes when the event starts; the backend refuses a close after the
		// start, and never registers anyone once the event is under way.
		{ key: "registration_opens_at", labelKey: "events.form.registrationOpensAt", type: "datetime" },
		{ key: "registration_closes_at", labelKey: "events.form.registrationClosesAt", type: "datetime" },
		// For an external event this is the only way to say it is full — its
		// seats are counted on someone else's form. It closes an in-app event
		// too, whatever its capacity.
		{ key: "is_marked_full", labelKey: "events.form.isMarkedFull", type: "switch" },
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

	return {
		category_id: null,
		title: { ar: "", en: "" },
		description: { ar: "", en: "" },
		sessions: [{ start_at: toOffsetIso(now), end_at: toOffsetIso(twoHoursLater) }],
		location: "",
		capacity: null,
		requires_approval: false,
		registration_source: "internal",
		external_form_url: "",
		registration_opens_at: "",
		registration_closes_at: "",
		is_marked_full: false,
		is_free: true,
		price_points: 0,
		image_url: "",
		status: "draft",
		order: 0
	}
}
