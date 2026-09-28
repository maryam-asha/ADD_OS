import { describe, expect, it } from "vitest"
import ar from "@/add-os/lang/ar/ar.json"
import en from "@/add-os/lang/en/en.json"
import { settingHint, settingLabel, settingTextId } from "../settingText"

/**
 * Every setting key the backend seeds or reads (ADD Core's SettingSeeder and
 * its `settings->get()` calls). A key added there shows here as its raw key
 * until it is given a name in both languages.
 */
const BACKEND_KEYS = [
	"app.timezone",
	"booking.allow_past_bookings",
	"booking.buffer_minutes",
	"booking.cancellation_window_minutes",
	"booking.duration_options_minutes",
	"booking.max_days_ahead",
	"booking.min_duration_minutes",
	"booking.min_notice_minutes",
	"booking.overrun_grace_minutes",
	"booking.slot_granularity_minutes",
	"booking.vat_percent",
	"guest.host_approval_timeout_seconds",
	"kiosk.app_store_url",
	"kiosk.arrival_qr_value",
	"kiosk.arrival_request_expiry_minutes",
	"kiosk.google_play_url",
	"module.cafe.is_enabled",
	"point.rate_usd",
	"profile.completion_threshold"
]

type Fields = Record<string, { label: string; hint: string }>

function lookup(messages: { systemSettings: { fields: Fields } }) {
	const get = (path: string): unknown =>
		path.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages)
	return {
		t: (path: string) => String(get(path)),
		te: (path: string) => typeof get(path) === "string"
	}
}

describe("setting names and hints", () => {
	it("names and describes every backend setting in both languages", () => {
		for (const [lang, messages] of [["en", en], ["ar", ar]] as const) {
			const fields = (messages as unknown as { systemSettings: { fields: Fields } }).systemSettings.fields
			for (const key of BACKEND_KEYS) {
				const entry = fields[settingTextId(key)]
				expect(entry?.label, `${lang}: ${key} label`).toBeTruthy()
				expect(entry?.hint, `${lang}: ${key} hint`).toBeTruthy()
			}
		}
	})

	it("reads a dotted key under its underscore id", () => {
		const { t, te } = lookup(ar as unknown as { systemSettings: { fields: Fields } })
		expect(settingTextId("module.cafe.is_enabled")).toBe("module_cafe_is_enabled")
		expect(settingLabel("booking.min_notice_minutes", t, te)).toBe("أقل مهلة قبل بدء الحجز (دقائق)")
		expect(settingHint("booking.max_days_ahead", t, te)).toContain("0 = بلا حد")
	})

	it("falls back to the raw key, with no hint, for a key not yet named", () => {
		const { t, te } = lookup(en as unknown as { systemSettings: { fields: Fields } })
		expect(settingLabel("booking.something_new", t, te)).toBe("booking.something_new")
		expect(settingHint("booking.something_new", t, te)).toBeNull()
	})
})
