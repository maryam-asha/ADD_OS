// src/add-os/modules/settings/config/settings.config.ts
import type { DataTableColumns } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { Setting, SettingJsonValue, SettingValue } from "@/add-os/modules/settings/types/setting"
import { NButton, NInput, NInputNumber, NSwitch, NTag, NTimePicker } from "naive-ui"
import { h } from "vue"
import { formatDateTime, formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * Everything about a settings row that is a rule rather than a rendering
 * decision, plus the column builder that renders it.
 *
 * ── This file names keys, but it is NOT the render list ─────────────────────
 * `SettingsPage` renders whatever `GET /admin/settings` returns, in the order
 * it returns it. The maps below are *overrides* keyed by setting key:
 * `SETTING_LABEL_SLUGS` supplies a human label where one has been written,
 * `SETTING_CONFIRM_KEYS` marks the two keys worth a confirm, and
 * `DURATION_KEY_PATTERN` decides which ints get a client-side floor. A key
 * absent from all three still renders — with a formatted-from-key label, no
 * confirm, and no floor. That is deliberate: `SettingSeeder` gains keys over
 * time (the S4 access-control work is expected to add TTLock ones), and a
 * hardcoded render list would silently drop every one of them.
 */

/**
 * Setting key → i18n slug under `settings.keys.<slug>`, which carries `.label`
 * and `.description`.
 *
 * A slug rather than the key itself because vue-i18n resolves a dotted path
 * segment by segment: `t("settings.keys.module.cafe.is_enabled.label")` would
 * look for a nested `module` → `cafe` → `is_enabled` object, so the catalogue
 * would have to mirror every key's dot structure. One flat camelCase leaf per
 * key keeps the ar/en catalogues readable and diffable.
 *
 * These are the 13 keys `SettingSeeder` creates as of 2026-08-26.
 */
export const SETTING_LABEL_SLUGS: Readonly<Record<string, string>> = {
	"booking.cancellation_window_minutes": "bookingCancellationWindow",
	"booking.slot_granularity_minutes": "bookingSlotGranularity",
	"booking.min_duration_minutes": "bookingMinDuration",
	"booking.overrun_grace_minutes": "bookingOverrunGrace",
	"booking.buffer_minutes": "bookingBuffer",
	"profile.completion_threshold": "profileCompletionThreshold",
	"guest.host_approval_timeout_seconds": "guestHostApprovalTimeout",
	"kiosk.arrival_request_expiry_minutes": "kioskArrivalRequestExpiry",
	"kiosk.app_store_url": "kioskAppStoreUrl",
	"kiosk.google_play_url": "kioskGooglePlayUrl",
	"kiosk.arrival_qr_value": "kioskArrivalQrValue",
	"module.cafe.is_enabled": "moduleCafeIsEnabled",
	"app.timezone": "appTimezone"
}

/**
 * The two keys that get a confirm before Save fires. Both fail *silently* —
 * nothing on screen reports the damage:
 *
 * - `app.timezone` rebases how every stored `starts_at`/`ends_at` in the system
 *   renders. ADDCore runs on `'timezone' => 'UTC'` (see `utils/format/dates.ts`
 *   on `toOffsetIso`), so this row is what turns a stored instant into the wall
 *   clock an operator reads. Changing it moves every booking on every screen.
 * - `kiosk.arrival_qr_value` is the payload behind every printed and displayed
 *   arrival QR in the venue. Changing it invalidates all of them at once, and
 *   the only symptom is members whose scan stops working.
 *
 * Deliberately not extended to the two store URLs: a wrong app-store link is
 * visible the moment someone taps it, and is fixed by editing the same field
 * again.
 */
export const SETTING_CONFIRM_KEYS: ReadonlySet<string> = new Set(["app.timezone", "kiosk.arrival_qr_value"])

export function needsSaveConfirmation(key: string): boolean {
	return SETTING_CONFIRM_KEYS.has(key)
}

/**
 * `int` keys that get a client-side floor of 0.
 *
 * The backend has no floor at all (`UpdateSettingRequest` validates plain
 * `integer`), so this is ours, and it is scoped by suffix rather than applied
 * to every `int`. A negative *duration* is meaningless for all seven keys that
 * currently end this way, but a future int key could legitimately be negative —
 * an offset, a delta, a correction — and a blanket floor would refuse a value
 * the server accepts while presenting itself as a convenience. Anchored at the
 * end of the key so `booking.minutes_offset` is not caught by mentioning
 * "minutes" mid-name.
 *
 * There is deliberately no `max` anywhere: the backend has no upper limit, and
 * inventing one here would only get in the way.
 */
const DURATION_KEY_PATTERN = /_(?:minutes|seconds)$/

export function hasNonNegativeMinimum(key: string): boolean {
	return DURATION_KEY_PATTERN.test(key)
}

/** Mirrors the server's `date_format:H:i` — the same pattern `business-hours.config.ts` uses, for the same rule. */
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/

/** The i18n slug for a key, or `null` when no label has been written for it yet. */
export function settingLabelSlug(key: string): string | null {
	return SETTING_LABEL_SLUGS[key] ?? null
}

/**
 * A readable label for a key with no override — "booking.buffer_minutes"
 * becomes "Booking buffer minutes".
 *
 * Not localised, and it cannot be: the input is an English identifier chosen by
 * a backend seeder. It is the honest rendering of an un-labelled key, and the
 * fix for seeing one in the UI is to add an entry to `SETTING_LABEL_SLUGS` plus
 * the ar/en catalogues — not to translate this function's output.
 */
export function formatSettingKey(key: string): string {
	const words = key.replace(/[._]+/g, " ").trim()
	return words.charAt(0).toUpperCase() + words.slice(1)
}

export function settingLabel(t: ComposerTranslation, key: string): string {
	const slug = settingLabelSlug(key)
	return slug === null ? formatSettingKey(key) : t(`settings.keys.${slug}.label`)
}

/** The one-line purpose shown under the label, when the key has an override. Absent for an unknown key. */
export function settingDescription(t: ComposerTranslation, key: string): string | null {
	const slug = settingLabelSlug(key)
	return slug === null ? null : t(`settings.keys.${slug}.description`)
}

/**
 * What an in-progress edit holds. Narrower than `SettingValue` on purpose: a
 * `json` row is edited as *text* in a textarea, so its draft is the serialised
 * string and `prepareSettingValue` is the one place that parses it back.
 */
export type SettingDraft = number | boolean | string | null

/**
 * The working copy a row starts an edit with.
 *
 * `null` is reachable for any type — `Setting::resolvedValue()` returns it
 * whenever the stored column is null — so each type maps it to something its
 * own control can actually hold, rather than binding `null` into an
 * `n-switch`/`n-input` that cannot represent it. `int` keeps `null` because
 * `n-input-number` treats it as "empty", which is exactly right; the empty
 * value is then refused at save time rather than sent into a `required` rule.
 */
export function draftForSetting(setting: Setting): SettingDraft {
	if (setting.type === "json") {
		return setting.value === null ? "" : JSON.stringify(setting.value, null, 2)
	}
	if (setting.value === null) {
		return setting.type === "bool" ? false : setting.type === "int" ? null : ""
	}
	return setting.value as SettingDraft
}

export type PreparedSettingValue = { ok: true; value: SettingValue } | { ok: false; errorKey: string }

/**
 * The one place operator input becomes a wire value — same job, and the same
 * reason, as `toWireSymbol` in `services/currencies.ts`, and the whole reason
 * this page exists as something other than a text field per row.
 *
 * Every branch mirrors a rule `UpdateSettingRequest` already enforces, so a
 * value that passes here is a value the server is not expected to reject on
 * shape. Nothing is *loosened* to be helpful — a numeric string is refused
 * rather than parsed, because `integer` would 422 it and quietly repairing
 * input teaches an operator a rule the API does not have.
 *
 * `app.timezone` is the one row with a server rule this cannot mirror: Laravel's
 * `timezone` validator accepts any tz identifier, and the identifier list is the
 * server's. Checking it against a hardcoded whitelist here would reject valid
 * input, so the string check is all that runs and a bad identifier comes back as
 * a toasted 422.
 */
export function prepareSettingValue(setting: Setting, draft: unknown): PreparedSettingValue {
	switch (setting.type) {
		case "int": {
			if (typeof draft !== "number" || !Number.isInteger(draft)) {
				return { ok: false, errorKey: "settings.validation.integerRequired" }
			}
			if (hasNonNegativeMinimum(setting.key) && draft < 0) {
				return { ok: false, errorKey: "settings.validation.nonNegative" }
			}
			return { ok: true, value: draft }
		}
		case "bool": {
			return typeof draft === "boolean" ? { ok: true, value: draft } : { ok: false, errorKey: "settings.validation.booleanRequired" }
		}
		case "string": {
			if (typeof draft !== "string") return { ok: false, errorKey: "settings.validation.stringRequired" }
			const trimmed = draft.trim()
			// Laravel's `required` rejects "", so an empty field is a guaranteed 422 —
			// refused here instead of being stored as a zero-length string.
			return trimmed === "" ? { ok: false, errorKey: "settings.validation.stringRequired" } : { ok: true, value: trimmed }
		}
		case "time": {
			return typeof draft === "string" && TIME_PATTERN.test(draft)
				? { ok: true, value: draft }
				: { ok: false, errorKey: "settings.validation.timeFormat" }
		}
		case "json": {
			if (typeof draft !== "string") return { ok: false, errorKey: "settings.validation.jsonInvalid" }
			let parsed: unknown
			try {
				parsed = JSON.parse(draft)
			} catch {
				// Caught before the request, which is the point: a syntax error is the
				// operator's typo, and a round trip to hear it back as a 500 or a
				// generic 422 is worse feedback than saying so immediately.
				return { ok: false, errorKey: "settings.validation.jsonInvalid" }
			}
			// The server rule is `array`, which takes a JSON object or array (both
			// decode to a PHP array) and refuses a bare scalar — `5` and `"text"` are
			// valid JSON documents and still a 422.
			if (parsed === null || typeof parsed !== "object") {
				return { ok: false, errorKey: "settings.validation.jsonNotObject" }
			}
			return { ok: true, value: parsed as SettingJsonValue }
		}
	}
}

/**
 * NTimePicker parses `formatted-value` strictly and only special-cases `null`;
 * every other string, `""` included, is run through date-fns and then
 * `format()`, and an unparseable one throws synchronously during render. This is
 * the same crash-avoidance shape check `ResourceFormDrawer` documents at length
 * — a shape guard, not the business rule. `prepareSettingValue` is still the
 * validator, so a value rejected here shows the picker as empty while the draft
 * itself is left untouched.
 */
function toPickerTimeValue(draft: SettingDraft): string | null {
	return typeof draft === "string" && TIME_PATTERN.test(draft) ? draft : null
}

/** Read-only rendering of a stored value, by type. Never a control — the edit control is a separate branch. */
function renderStoredValue(t: ComposerTranslation, setting: Setting) {
	if (setting.value === null) return "—"

	switch (setting.type) {
		case "int":
			return formatNumber(setting.value as number)
		case "bool":
			return h(
				NTag,
				{ size: "small", round: true, bordered: false, type: setting.value ? "success" : "default" },
				{ default: () => t(setting.value ? "settings.value.enabled" : "settings.value.disabled") }
			)
		case "json":
			return h("code", { class: "font-mono text-xs" }, JSON.stringify(setting.value))
		// `time` shares `string`'s rendering: both arrive as strings and both are
		// read verbatim. A time is shown as its own "HH:mm" text rather than
		// re-formatted through `utils/format`, which would localise digits a
		// `date_format:H:i` field must round-trip unchanged.
		default:
			return String(setting.value)
	}
}

export interface SettingRowHandlers {
	/** `key` of the row currently in edit mode, or `null`. Exactly one row at a time. */
	editingKey: string | null
	/** The in-progress value for that one row. Meaningless while `editingKey` is null. */
	draft: SettingDraft
	onDraft: (value: SettingDraft) => void
	onEdit: (row: Setting) => void
	onSave: () => void
	onCancel: () => void
	/** False for an `operations` account — update is admin-only, so no row offers an edit control at all. */
	canEdit: boolean
	/** A save is in flight; the row's buttons show it and cannot be clicked twice. */
	isSaving: boolean
}

/**
 * The edit control for one row, chosen by the row's own `type`. This mapping is
 * the reason the page is a page rather than a list of text inputs: an operator
 * editing `module.cafe.is_enabled` gets a switch, not the string `"1"` to
 * retype, and the value that leaves each control is already the JSON type the
 * server's per-type rule expects.
 */
function renderEditControl(t: ComposerTranslation, setting: Setting, handlers: SettingRowHandlers) {
	const label = settingLabel(t, setting.key)

	switch (setting.type) {
		case "int":
			return h(NInputNumber, {
				"value": handlers.draft as number | null,
				"aria-label": label,
				// Whole numbers only, in the control as well as at save time: the
				// server's rule is `integer`, so offering a spinner that can produce
				// 15.5 would offer a guaranteed 422.
				"precision": 0,
				"step": 1,
				"min": hasNonNegativeMinimum(setting.key) ? 0 : undefined,
				"class": "w-full",
				"onUpdate:value": (value: number | null) => handlers.onDraft(value)
			})
		case "bool":
			return h(NSwitch, {
				"value": handlers.draft === true,
				"aria-label": label,
				"onUpdate:value": (value: boolean) => handlers.onDraft(value)
			})
		case "time":
			return h(NTimePicker, {
				"formattedValue": toPickerTimeValue(handlers.draft),
				"format": "HH:mm",
				// "HH:mm", never "HH:mm:ss" — `date_format:H:i` rejects seconds.
				"valueFormat": "HH:mm",
				"aria-label": label,
				"class": "w-full",
				"onUpdate:formattedValue": (value: string | null) => handlers.onDraft(value ?? "")
			})
		case "json":
			return h(NInput, {
				"value": typeof handlers.draft === "string" ? handlers.draft : "",
				"type": "textarea",
				"autosize": { minRows: 3, maxRows: 12 },
				"aria-label": label,
				"class": "font-mono",
				"onUpdate:value": (value: string) => handlers.onDraft(value)
			})
		default:
			return h(NInput, {
				"value": typeof handlers.draft === "string" ? handlers.draft : "",
				"aria-label": label,
				"onUpdate:value": (value: string) => handlers.onDraft(value)
			})
	}
}

function renderActions(t: ComposerTranslation, setting: Setting, handlers: SettingRowHandlers) {
	// Presence, not a disabled state, decides whether an edit control exists —
	// the rule `ResourceTable` documents for its delete button. `PATCH
	// /admin/settings/{key}` is admin-only, so for an operations account this is
	// a read-only page rather than a page of buttons that can only 403.
	if (!handlers.canEdit) return null

	if (handlers.editingKey === setting.key) {
		return h("div", { class: "flex gap-2" }, [
			h(NButton, { size: "small", type: "primary", loading: handlers.isSaving, onClick: () => handlers.onSave() }, { default: () => t("common.save") }),
			h(NButton, { size: "small", disabled: handlers.isSaving, onClick: () => handlers.onCancel() }, { default: () => t("resourceCrud.form.cancel") })
		])
	}

	const editLabel = t("resourceCrud.table.editAction")
	// One row at a time, and the other rows say so rather than silently throwing
	// away an in-progress draft when a second Edit is clicked.
	const blocked = handlers.editingKey !== null

	return h(
		NButton,
		{
			"text": true,
			"type": "primary",
			"disabled": blocked,
			"aria-label": editLabel,
			"title": blocked ? t("settings.finishEditingFirst") : editLabel,
			"onClick": () => handlers.onEdit(setting)
		},
		{ icon: () => h(Icon, { name: "carbon:edit", size: 18 }) }
	)
}

export function buildSettingColumns(t: ComposerTranslation, handlers: SettingRowHandlers): DataTableColumns<Setting> {
	return [
		{
			title: t("settings.columns.key"),
			key: "key",
			render: row =>
				h("div", { class: "flex flex-col gap-1" }, [
					h("span", null, settingLabel(t, row.key)),
					// The raw key, verbatim and monospaced: it is the identifier an
					// operator quotes to a developer, and the thing the backend's own
					// docs and seeder name. Never translated.
					h("code", { class: "text-secondary font-mono text-xs" }, row.key),
					...(settingDescription(t, row.key) === null ? [] : [h("span", { class: "text-secondary text-xs" }, settingDescription(t, row.key)!)])
				])
		},
		{
			title: t("settings.columns.type"),
			key: "type",
			// Shown because it is the one thing that explains the control: an operator
			// who knows this row is `int` knows why it will not accept "half an hour".
			render: row => h(NTag, { size: "small", bordered: false }, { default: () => t(`settings.types.${row.type}` as const satisfies string) })
		},
		{
			title: t("settings.columns.value"),
			key: "value",
			render: row => (handlers.editingKey === row.key ? renderEditControl(t, row, handlers) : renderStoredValue(t, row))
		},
		{
			title: t("settings.columns.updatedAt"),
			key: "updated_at",
			// Refetched rather than patched in place after a save, so this is the
			// server's own timestamp — the visible confirmation that the write landed.
			render: row => (row.updated_at === null ? "—" : formatDateTime(row.updated_at))
		},
		{ title: t("resourceCrud.table.actionsColumn"), key: "actions", render: row => renderActions(t, row, handlers) }
	]
}
