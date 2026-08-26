// src/add-os/modules/kiosk/config/announcements.config.ts
import type { DataTableColumns, FormItemRule } from "naive-ui"
import type { Ref } from "vue"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { Announcement, AnnouncementPayload } from "@/add-os/modules/kiosk/types/announcement"
import { NTag } from "naive-ui"
import { h } from "vue"
import { formatDateTime, formatNumber } from "@/add-os/utils/format"

/** Mirrors StoreAnnouncementRequest exactly. Diverging from these is a guaranteed 422. */
const MAX_TYPE_LENGTH = 50
const MAX_URL_LENGTH = 2048

/**
 * Parses as an absolute URL, and nothing stricter.
 *
 * Deliberately NOT a scheme allowlist. Laravel validates with `url`, which is
 * `FILTER_VALIDATE_URL` and accepts more schemes than http/https; a stricter
 * client rule would reject values the server would have taken, which is the
 * worse failure of the two. The server stays authoritative — a 422 lands on the
 * field through ResourceFormDrawer's own handler. This check exists only to give
 * fast feedback on an obviously malformed entry.
 */
function isAbsoluteUrl(value: string): boolean {
	try {
		return Boolean(new URL(value))
	} catch {
		return false
	}
}

function renderWindow(t: ComposerTranslation, row: Announcement): string {
	if (row.starts_at === null && row.ends_at === null) return t("announcements.windowAlways")

	const from = row.starts_at === null ? t("announcements.windowOpenStart") : formatDateTime(row.starts_at)
	const to = row.ends_at === null ? t("announcements.windowOpenEnd") : formatDateTime(row.ends_at)

	return `${from} – ${to}`
}

export function buildAnnouncementColumns(t: ComposerTranslation): DataTableColumns<Announcement> {
	return [
		{
			// Leads the table because it is what the kiosk actually orders by.
			title: t("announcements.columns.sortOrder"),
			key: "sort_order",
			render: row => formatNumber(row.sort_order)
		},
		{ title: t("announcements.columns.type"), key: "type" },
		{ title: t("announcements.columns.imageUrl"), key: "image_url", ellipsis: { tooltip: true } },
		{
			title: t("announcements.columns.window"),
			key: "starts_at",
			render: row => renderWindow(t, row)
		},
		{
			title: t("announcements.columns.isActive"),
			key: "is_active",
			render: row =>
				h(
					NTag,
					{ type: row.is_active ? "success" : "default", size: "small", bordered: false },
					{ default: () => (row.is_active ? t("announcements.isActiveYes") : t("announcements.isActiveNo")) }
				)
		}
	]
}

/**
 * Takes the live form ref, not just `t`, because one rule is cross-field.
 *
 * `FieldDescriptor.rule` is static and a `FormItemRule.validator` receives only
 * `(rule, value)` — it cannot see the rest of the model. Closing over the ref is
 * how `ends_at` reads `starts_at`. This needs no new mechanism: a config builder
 * taking arguments and being called inside a `computed` is the existing pattern
 * (see `buildResourceFields(t, branches, locale)`).
 *
 * Known limit, accepted: n-form fires a field's rules on that field's OWN
 * triggers, so moving `starts_at` past an already-set `ends_at` does not
 * re-validate `ends_at` until submit. `formRef.validate()` runs every rule on
 * submit, so an invalid pair can never be sent — which is what matters. Live
 * cross-field revalidation would mean a watcher per dependent field inside the
 * shared drawer, and that is not worth building for one form.
 *
 * Every field here carries an explicit `rule` rather than `required: true`,
 * because each needs a length or format check alongside emptiness.
 * ResourceFormDrawer skips its generic required-rule builder whenever `rule` is
 * present, so `required: true` is set INSIDE each rule object — naive-ui reads
 * it for the label asterisk.
 */
export function buildAnnouncementFields(t: ComposerTranslation, form: Ref<AnnouncementPayload>): FieldDescriptor<AnnouncementPayload>[] {
	const typeRule: FormItemRule = {
		required: true,
		trigger: ["blur", "change", "input"],
		validator: (_rule, value: unknown) => {
			const text = typeof value === "string" ? value.trim() : ""
			if (text === "") return new Error(t("resourceCrud.validation.required", { field: t("announcements.form.type") }))
			if (text.length > MAX_TYPE_LENGTH) return new Error(t("announcements.validation.typeTooLong", { max: MAX_TYPE_LENGTH }))
			return true
		}
	}

	const urlRule = (required: boolean, labelKey: string): FormItemRule => ({
		required,
		trigger: ["blur", "change", "input"],
		validator: (_rule, value: unknown) => {
			const text = typeof value === "string" ? value.trim() : ""
			if (text === "") {
				return required ? new Error(t("resourceCrud.validation.required", { field: t(labelKey) })) : true
			}
			if (text.length > MAX_URL_LENGTH) return new Error(t("announcements.validation.urlTooLong", { max: MAX_URL_LENGTH }))
			if (!isAbsoluteUrl(text)) return new Error(t("announcements.validation.urlInvalid"))
			return true
		}
	})

	/** Mirrors the backend's `after_or_equal:starts_at`. An equal end is allowed. */
	const endsAtRule: FormItemRule = {
		trigger: ["blur", "change"],
		validator: (_rule, value: unknown) => {
			const startsAt = form.value.starts_at
			if (typeof value !== "number" || startsAt === null) return true
			return value >= startsAt ? true : new Error(t("announcements.validation.endsBeforeStarts"))
		}
	}

	return [
		/**
		 * A plain text input, NOT a select. `type` is an open string server-side —
		 * the ADDCore model says so in as many words — and news/event/offer are the
		 * three values seeded today, not the permitted set. A three-option dropdown
		 * would turn "add a new kind of banner" from typing a word into a frontend
		 * change.
		 */
		{ key: "type", labelKey: "announcements.form.type", type: "text", rule: typeRule },
		{ key: "image_url", labelKey: "announcements.form.imageUrl", type: "text", rule: urlRule(true, "announcements.form.imageUrl") },
		{ key: "link_url", labelKey: "announcements.form.linkUrl", type: "text", rule: urlRule(false, "announcements.form.linkUrl") },
		{ key: "sort_order", labelKey: "announcements.form.sortOrder", type: "number" },
		{ key: "starts_at", labelKey: "announcements.form.startsAt", type: "datetime" },
		{ key: "ends_at", labelKey: "announcements.form.endsAt", type: "datetime", rule: endsAtRule },
		{ key: "is_active", labelKey: "announcements.form.isActive", type: "switch" }
	]
}

/**
 * `sort_order: 0` and `is_active: true` match what
 * `AnnouncementController::store` merges under the validated input, so a created
 * row looks the same whether the operator touched those fields or not.
 */
export function emptyAnnouncementPayload(): AnnouncementPayload {
	return { type: "", image_url: "", link_url: "", sort_order: 0, starts_at: null, ends_at: null, is_active: true }
}
