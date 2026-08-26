import type { Setting } from "@/add-os/modules/settings/types/setting"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { listSettings, updateSetting } from "../settings"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const intSetting: Setting = {
	key: "booking.cancellation_window_minutes",
	type: "int",
	value: 60,
	updated_at: "2026-08-26T09:00:00.000000Z"
}

const boolSetting: Setting = {
	key: "module.cafe.is_enabled",
	type: "bool",
	value: true,
	updated_at: "2026-08-26T09:00:00.000000Z"
}

const stringSetting: Setting = {
	key: "kiosk.arrival_qr_value",
	type: "string",
	value: "addapp://arrival",
	updated_at: "2026-08-26T09:00:00.000000Z"
}

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

function requestBody(): unknown {
	return JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body))
}

describe("settings service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("listSettings GETs the collection and unwraps it", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [intSetting, boolSetting] }))

		const settings = await listSettings()

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/settings", expect.objectContaining({ method: "GET" }))
		expect(settings).toEqual([intSetting, boolSetting])
	})

	/**
	 * The endpoint is a plain resource collection — `SettingController::index()`
	 * returns `->orderBy('key')->get()` with no `meta` — so there is no page to
	 * discard and no client-side re-sort to apply.
	 */
	it("returns the server's own key order untouched", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [intSetting, boolSetting, stringSetting] }))

		const settings = await listSettings()

		expect(settings.map(s => s.key)).toEqual([intSetting.key, boolSetting.key, stringSetting.key])
	})

	/**
	 * `SettingResource` calls `Setting::resolvedValue()`, which casts out of the
	 * text column into a real int/bool/array before serialising. Nothing here
	 * parses or coerces — a service that "helpfully" stringified these would make
	 * every typed control downstream wrong.
	 */
	it("hands back each value in the JSON type it arrived as", async () => {
		vi.mocked(fetch).mockResolvedValue(
			jsonResponse({
				data: [intSetting, boolSetting, stringSetting, { key: "x.json", type: "json", value: { a: [1, 2] }, updated_at: null }]
			})
		)

		const [int, bool, str, json] = await listSettings()

		expect(int.value).toBe(60)
		expect(bool.value).toBe(true)
		expect(str.value).toBe("addapp://arrival")
		expect(json.value).toEqual({ a: [1, 2] })
	})

	it("updateSetting PATCHes the key in the path and wraps the value in a `value` body", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Setting updated." }))

		await updateSetting("booking.buffer_minutes", 15)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/settings/booking.buffer_minutes", expect.objectContaining({ method: "PATCH" }))
		expect(requestBody()).toEqual({ value: 15 })
	})

	/**
	 * `UpdateSettingRequest` validates per the row's own type — `integer` for an
	 * int key, `boolean` for a bool key. A stringified `"15"` or `"1"` is a 422,
	 * so the value must cross the wire in its real JSON type.
	 */
	describe("the value crosses the wire in its own JSON type", () => {
		it("sends an int as a number, never a string", async () => {
			vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Setting updated." }))

			await updateSetting("booking.buffer_minutes", 0)

			expect(requestBody()).toEqual({ value: 0 })
			expect(typeof (requestBody() as { value: unknown }).value).toBe("number")
		})

		it("sends a bool as a boolean, never \"1\"", async () => {
			vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Setting updated." }))

			await updateSetting("module.cafe.is_enabled", false)

			expect(requestBody()).toEqual({ value: false })
			expect(typeof (requestBody() as { value: unknown }).value).toBe("boolean")
		})

		it("sends a json value as the parsed object, not as its source text", async () => {
			vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Setting updated." }))

			await updateSetting("some.json_key", { enabled: [1, 2] })

			expect(requestBody()).toEqual({ value: { enabled: [1, 2] } })
		})
	})

	/**
	 * A setting key is dotted, and `encodeURIComponent` leaves a dot alone — so
	 * the encoding is a no-op for every key `SettingSeeder` creates. It is here
	 * for the same reason `services/currencies.ts` encodes a currency code:
	 * building a path out of a server-supplied string without encoding it is the
	 * habit worth not having.
	 */
	it("keeps a dotted key readable in the path rather than escaping its dots", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Setting updated." }))

		await updateSetting("module.cafe.is_enabled", true)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/settings/module.cafe.is_enabled", expect.objectContaining({ method: "PATCH" }))
	})

	it("propagates ApiError on a per-type 422", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "The value field must be an integer." }, 422))

		await expect(updateSetting("booking.buffer_minutes", 15)).rejects.toMatchObject({ status: 422 })
	})

	/** Update answers `{message}`, never the updated row — the caller refetches. */
	it("returns the message envelope rather than a resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Setting updated." }))

		await expect(updateSetting("booking.buffer_minutes", 15)).resolves.toEqual({ message: "Setting updated." })
	})
})
