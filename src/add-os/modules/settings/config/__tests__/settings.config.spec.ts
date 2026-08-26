import type { Setting, SettingValueType } from "@/add-os/modules/settings/types/setting"
import { describe, expect, it } from "vitest"

import {
	draftForSetting,
	formatSettingKey,
	hasNonNegativeMinimum,
	needsSaveConfirmation,
	prepareSettingValue,
	SETTING_CONFIRM_KEYS,
	SETTING_LABEL_SLUGS,
	settingLabel,
	settingLabelSlug
} from "../settings.config"

/** Stands in for vue-i18n's `t`: echoes the key so a test can assert which one was asked for. */
const t = ((key: string) => key) as unknown as Parameters<typeof settingLabel>[0]

function setting(type: SettingValueType, key = "test.key", value: Setting["value"] = null): Setting {
	return { key, type, value, updated_at: "2026-08-26T09:00:00.000000Z" }
}

describe("settings config", () => {
	describe("per-key labels, with a fallback for keys that arrive later", () => {
		/**
		 * The 13 keys `SettingSeeder` creates today. This map is the ONLY place a
		 * key is written down, and it is an override table, not the render list —
		 * `SettingsPage` renders whatever `index` returns. The S4 access-control
		 * work is expected to add TTLock keys; those will render with the
		 * formatted-from-key fallback until they get an entry here, which is the
		 * whole point of the fallback existing.
		 */
		it("carries an override slug for each of the 13 keys seeded today", () => {
			expect(Object.keys(SETTING_LABEL_SLUGS).sort()).toEqual(
				[
					"app.timezone",
					"booking.buffer_minutes",
					"booking.cancellation_window_minutes",
					"booking.min_duration_minutes",
					"booking.overrun_grace_minutes",
					"booking.slot_granularity_minutes",
					"guest.host_approval_timeout_seconds",
					"kiosk.app_store_url",
					"kiosk.arrival_qr_value",
					"kiosk.arrival_request_expiry_minutes",
					"kiosk.google_play_url",
					"module.cafe.is_enabled",
					"profile.completion_threshold"
				].sort()
			)
		})

		it("gives every override a distinct i18n slug, so no two keys share a label", () => {
			const slugs = Object.values(SETTING_LABEL_SLUGS)
			expect(new Set(slugs).size).toBe(slugs.length)
		})

		it("asks i18n for a known key's label under its slug", () => {
			expect(settingLabelSlug("module.cafe.is_enabled")).toBe(SETTING_LABEL_SLUGS["module.cafe.is_enabled"])
			expect(settingLabel(t, "module.cafe.is_enabled")).toBe(`settings.keys.${SETTING_LABEL_SLUGS["module.cafe.is_enabled"]}.label`)
		})

		it("has no slug for a key it has never heard of", () => {
			expect(settingLabelSlug("lock.ttlock_client_id")).toBeNull()
		})

		/**
		 * The degradation that matters: a key added by a backend seeder tomorrow
		 * still renders a readable row today, rather than an empty cell or a raw
		 * `settings.keys.….label` leaking into the UI.
		 */
		it("falls back to a formatted version of an unknown key rather than a missing i18n key", () => {
			expect(settingLabel(t, "lock.ttlock_client_id")).toBe("Lock ttlock client id")
		})

		it("formats a key by flattening its dots and underscores into words", () => {
			expect(formatSettingKey("booking.cancellation_window_minutes")).toBe("Booking cancellation window minutes")
			expect(formatSettingKey("module.cafe.is_enabled")).toBe("Module cafe is enabled")
			expect(formatSettingKey("app.timezone")).toBe("App timezone")
		})

		it("leaves an already-bare key alone apart from capitalising it", () => {
			expect(formatSettingKey("timezone")).toBe("Timezone")
		})
	})

	describe("int values", () => {
		it("accepts a whole number and sends it as a number", () => {
			expect(prepareSettingValue(setting("int", "booking.buffer_minutes"), 15)).toEqual({ ok: true, value: 15 })
		})

		it("accepts zero, which is `booking.buffer_minutes`'s own seeded default", () => {
			expect(prepareSettingValue(setting("int", "booking.buffer_minutes"), 0)).toEqual({ ok: true, value: 0 })
		})

		/** `n-input-number` hands back `null` when its field is cleared; the server's rule is `required`. */
		it("refuses a cleared field instead of sending null into a required rule", () => {
			expect(prepareSettingValue(setting("int", "booking.buffer_minutes"), null)).toEqual({
				ok: false,
				errorKey: "settings.validation.integerRequired"
			})
		})

		it("refuses a fractional value, which the server's `integer` rule would 422", () => {
			expect(prepareSettingValue(setting("int", "booking.buffer_minutes"), 15.5)).toEqual({
				ok: false,
				errorKey: "settings.validation.integerRequired"
			})
		})

		it("refuses a numeric string, because `integer` rejects a quoted number", () => {
			expect(prepareSettingValue(setting("int", "booking.buffer_minutes"), "15")).toEqual({
				ok: false,
				errorKey: "settings.validation.integerRequired"
			})
		})

		/**
		 * The backend accepts any integer, so this floor is ours. It is scoped by
		 * key suffix rather than applied to every `int`: a future int key could
		 * legitimately be negative (an offset, a delta), and a blanket floor would
		 * block it silently while claiming to be a convenience.
		 */
		describe("the client-side floor of 0", () => {
			it("applies to every seeded minutes/seconds key", () => {
				expect(hasNonNegativeMinimum("booking.cancellation_window_minutes")).toBe(true)
				expect(hasNonNegativeMinimum("booking.slot_granularity_minutes")).toBe(true)
				expect(hasNonNegativeMinimum("booking.min_duration_minutes")).toBe(true)
				expect(hasNonNegativeMinimum("booking.overrun_grace_minutes")).toBe(true)
				expect(hasNonNegativeMinimum("booking.buffer_minutes")).toBe(true)
				expect(hasNonNegativeMinimum("guest.host_approval_timeout_seconds")).toBe(true)
				expect(hasNonNegativeMinimum("kiosk.arrival_request_expiry_minutes")).toBe(true)
			})

			it("does not apply to an int key that is not a duration", () => {
				expect(hasNonNegativeMinimum("profile.completion_threshold")).toBe(false)
			})

			it("does not apply to a key that merely mentions minutes mid-name", () => {
				expect(hasNonNegativeMinimum("booking.minutes_offset")).toBe(false)
			})

			it("refuses a negative duration", () => {
				expect(prepareSettingValue(setting("int", "booking.buffer_minutes"), -1)).toEqual({
					ok: false,
					errorKey: "settings.validation.nonNegative"
				})
			})

			it("still lets a non-duration int go negative, leaving the backend authoritative", () => {
				expect(prepareSettingValue(setting("int", "profile.completion_threshold"), -1)).toEqual({ ok: true, value: -1 })
			})
		})
	})

	describe("bool values", () => {
		it("accepts true and false as real booleans", () => {
			expect(prepareSettingValue(setting("bool", "module.cafe.is_enabled"), true)).toEqual({ ok: true, value: true })
			expect(prepareSettingValue(setting("bool", "module.cafe.is_enabled"), false)).toEqual({ ok: true, value: false })
		})

		it("refuses \"1\", which is how the value is STORED but not how it is sent", () => {
			expect(prepareSettingValue(setting("bool", "module.cafe.is_enabled"), "1")).toEqual({
				ok: false,
				errorKey: "settings.validation.booleanRequired"
			})
		})
	})

	describe("string values", () => {
		it("accepts text and trims it", () => {
			expect(prepareSettingValue(setting("string", "kiosk.arrival_qr_value"), "  addapp://arrival  ")).toEqual({
				ok: true,
				value: "addapp://arrival"
			})
		})

		/** The server rule is `required|string`, and Laravel's `required` rejects `""`. */
		it("refuses an empty field rather than storing a zero-length string", () => {
			expect(prepareSettingValue(setting("string", "kiosk.arrival_qr_value"), "")).toEqual({
				ok: false,
				errorKey: "settings.validation.stringRequired"
			})
		})

		it("refuses a whitespace-only field for the same reason", () => {
			expect(prepareSettingValue(setting("string", "kiosk.arrival_qr_value"), "   ")).toEqual({
				ok: false,
				errorKey: "settings.validation.stringRequired"
			})
		})

		/**
		 * `app.timezone` is a `string` row with a special server rule — Laravel's
		 * `timezone` validator, which accepts any tz identifier. No whitelist is
		 * mirrored here on purpose: the identifier list is the server's, and
		 * hardcoding a subset would reject valid input the backend would accept.
		 */
		it("passes any tz identifier through for app.timezone rather than checking it against a list", () => {
			expect(prepareSettingValue(setting("string", "app.timezone"), "Asia/Damascus")).toEqual({ ok: true, value: "Asia/Damascus" })
			expect(prepareSettingValue(setting("string", "app.timezone"), "UTC")).toEqual({ ok: true, value: "UTC" })
			expect(prepareSettingValue(setting("string", "app.timezone"), "Europe/London")).toEqual({ ok: true, value: "Europe/London" })
		})
	})

	describe("time values", () => {
		it("accepts HH:mm", () => {
			expect(prepareSettingValue(setting("time", "some.time_key"), "08:30")).toEqual({ ok: true, value: "08:30" })
			expect(prepareSettingValue(setting("time", "some.time_key"), "00:00")).toEqual({ ok: true, value: "00:00" })
			expect(prepareSettingValue(setting("time", "some.time_key"), "23:59")).toEqual({ ok: true, value: "23:59" })
		})

		/**
		 * The server rule is `date_format:H:i`, so seconds are rejected — the same
		 * contract `types/business-hour.ts` records for open_time/close_time, and
		 * the reason `n-time-picker` is bound with `value-format="HH:mm"` here.
		 */
		it("refuses HH:mm:ss", () => {
			expect(prepareSettingValue(setting("time", "some.time_key"), "08:30:00")).toEqual({
				ok: false,
				errorKey: "settings.validation.timeFormat"
			})
		})

		it("refuses an out-of-range or malformed clock time", () => {
			expect(prepareSettingValue(setting("time", "some.time_key"), "24:00")).toMatchObject({ ok: false })
			expect(prepareSettingValue(setting("time", "some.time_key"), "8:30")).toMatchObject({ ok: false })
			expect(prepareSettingValue(setting("time", "some.time_key"), "08:60")).toMatchObject({ ok: false })
			expect(prepareSettingValue(setting("time", "some.time_key"), "")).toMatchObject({ ok: false })
		})
	})

	describe("json values", () => {
		it("parses the textarea's text and sends the parsed value", () => {
			expect(prepareSettingValue(setting("json", "some.json_key"), '{"a": [1, 2]}')).toEqual({ ok: true, value: { a: [1, 2] } })
		})

		it("accepts a top-level array too, which Laravel's `array` rule also takes", () => {
			expect(prepareSettingValue(setting("json", "some.json_key"), "[1, 2]")).toEqual({ ok: true, value: [1, 2] })
		})

		it("reports malformed JSON as a syntax error, so the bad text never reaches the network", () => {
			expect(prepareSettingValue(setting("json", "some.json_key"), "{a: 1}")).toEqual({
				ok: false,
				errorKey: "settings.validation.jsonInvalid"
			})
		})

		/** `array` rejects a bare scalar even though `5` and `"text"` are valid JSON documents. */
		it("refuses a valid-JSON scalar, which the server's `array` rule would 422", () => {
			expect(prepareSettingValue(setting("json", "some.json_key"), "5")).toEqual({
				ok: false,
				errorKey: "settings.validation.jsonNotObject"
			})
			expect(prepareSettingValue(setting("json", "some.json_key"), '"text"')).toEqual({
				ok: false,
				errorKey: "settings.validation.jsonNotObject"
			})
			expect(prepareSettingValue(setting("json", "some.json_key"), "null")).toEqual({
				ok: false,
				errorKey: "settings.validation.jsonNotObject"
			})
		})
	})

	describe("the two keys that ask before saving", () => {
		/**
		 * Both break things silently rather than loudly. `app.timezone` rebases how
		 * every stored `starts_at`/`ends_at` renders; `kiosk.arrival_qr_value`
		 * invalidates every printed QR sticker in the venue the moment it changes.
		 */
		it("asks on app.timezone and kiosk.arrival_qr_value", () => {
			expect(needsSaveConfirmation("app.timezone")).toBe(true)
			expect(needsSaveConfirmation("kiosk.arrival_qr_value")).toBe(true)
			expect([...SETTING_CONFIRM_KEYS].sort()).toEqual(["app.timezone", "kiosk.arrival_qr_value"])
		})

		it("does not ask on a key whose worst case is visible immediately", () => {
			expect(needsSaveConfirmation("booking.buffer_minutes")).toBe(false)
			expect(needsSaveConfirmation("kiosk.app_store_url")).toBe(false)
		})
	})

	describe("the draft a row starts an edit with", () => {
		it("hands an int/bool/string/time value straight through", () => {
			expect(draftForSetting(setting("int", "booking.buffer_minutes", 0))).toBe(0)
			expect(draftForSetting(setting("bool", "module.cafe.is_enabled", true))).toBe(true)
			expect(draftForSetting(setting("string", "app.timezone", "Asia/Damascus"))).toBe("Asia/Damascus")
			expect(draftForSetting(setting("time", "some.time_key", "08:30"))).toBe("08:30")
		})

		/** The textarea edits text, so a json row's draft is its serialised form — indented to be readable. */
		it("serialises a json value into editable text", () => {
			expect(draftForSetting(setting("json", "some.json_key", { a: 1 }))).toBe('{\n  "a": 1\n}')
		})

		/**
		 * `resolvedValue()` returns null whenever the stored column is null, for any
		 * type. No seeded key is null today, but the draft still has to be
		 * editable* rather than crash the control it is bound to.
		 */
		it("turns a null into whatever its control can hold", () => {
			expect(draftForSetting(setting("int", "booking.buffer_minutes", null))).toBeNull()
			expect(draftForSetting(setting("bool", "module.cafe.is_enabled", null))).toBe(false)
			expect(draftForSetting(setting("string", "app.timezone", null))).toBe("")
			expect(draftForSetting(setting("time", "some.time_key", null))).toBe("")
			expect(draftForSetting(setting("json", "some.json_key", null))).toBe("")
		})
	})
})
