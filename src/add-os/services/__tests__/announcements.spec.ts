import type { AnnouncementPayload } from "@/add-os/modules/kiosk/types/announcement"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createAnnouncement, listAnnouncements, removeAnnouncement, toWirePayload, updateAnnouncement } from "../announcements"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const BASE = "http://api.test/api/v1/admin/announcements"

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

const row = {
	id: 1,
	type: "offer",
	image_url: "http://api.test/banners/offer.png",
	link_url: null,
	sort_order: 0,
	starts_at: null,
	ends_at: null,
	is_active: true,
	created_at: "2026-08-25T08:00:00.000000Z"
}

function formPayload(overrides: Partial<AnnouncementPayload> = {}): AnnouncementPayload {
	return {
		type: "offer",
		image_url: "http://api.test/banners/offer.png",
		link_url: "",
		sort_order: 0,
		starts_at: null,
		ends_at: null,
		is_active: true,
		...overrides
	}
}

describe("announcements service", () => {
	beforeEach(() => {
		vi.restoreAllMocks()
	})

	it("lists from the admin endpoint and returns the rows, not a paginator", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ data: [row] }))

		await expect(listAnnouncements()).resolves.toEqual([row])
		expect(String(vi.mocked(globalThis.fetch).mock.calls[0][0])).toBe(BASE)
	})

	it("creates with POST and returns the resource directly", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ data: row }))

		await expect(createAnnouncement(formPayload())).resolves.toEqual(row)

		const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0]
		expect(String(url)).toBe(BASE)
		expect((init as RequestInit).method).toBe("POST")
	})

	it("updates with PUT and returns the message body", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ message: "Announcement updated." }))

		await expect(updateAnnouncement(1, formPayload())).resolves.toEqual({ message: "Announcement updated." })

		const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0]
		expect(String(url)).toBe(`${BASE}/1`)
		expect((init as RequestInit).method).toBe("PUT")
	})

	// `null`, not `""` — the Fetch spec forbids a body on a 204 and the Response
	// constructor throws on one. `AdminResourceController::destroy` returns
	// exactly this: `noContent()`, with `api.ts` mapping the empty body to
	// `undefined`.
	it("deletes with DELETE", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }))

		await removeAnnouncement(1)

		const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0]
		expect(String(url)).toBe(`${BASE}/1`)
		expect((init as RequestInit).method).toBe("DELETE")
	})

	describe("toWirePayload", () => {
		/**
		 * The reason this function exists at all. ADDCore runs on
		 * `'timezone' => 'UTC'`, so a bare `2026-08-26 09:00:00` is READ as 09:00
		 * UTC — noon in Damascus. Asserted structurally rather than against a
		 * literal `+03:00`, because the suite runs in whatever zone the machine is
		 * set to and a hardcoded offset would pass here and nowhere else.
		 */
		it("serializes timestamps as local wall clock with an explicit offset", () => {
			const startsAt = new Date(2026, 7, 26, 9, 0, 0).getTime()
			const wire = toWirePayload(formPayload({ starts_at: startsAt }))

			expect(wire.starts_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/)
			expect(wire.starts_at!.startsWith("2026-08-26T09:00:00")).toBe(true)
		})

		it("never sends a bare wall-clock string with no offset", () => {
			const wire = toWirePayload(formPayload({ starts_at: new Date(2026, 7, 26, 9, 0, 0).getTime() }))

			expect(wire.starts_at).not.toMatch(/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}$/)
		})

		it("round-trips a timestamp back to the same instant", () => {
			const endsAt = new Date(2026, 7, 26, 17, 45, 0).getTime()
			const wire = toWirePayload(formPayload({ ends_at: endsAt }))

			expect(new Date(wire.ends_at!).getTime()).toBe(endsAt)
		})

		it("passes an unset timestamp through as null, not as an epoch date", () => {
			const wire = toWirePayload(formPayload({ starts_at: null, ends_at: null }))

			expect(wire.starts_at).toBeNull()
			expect(wire.ends_at).toBeNull()
		})

		/**
		 * An untouched text input holds "", and Laravel's `nullable|url` rejects an
		 * empty string outright — it is neither absent nor a URL. Mapping it to
		 * null is what makes "no link" expressible at all.
		 */
		it("maps an empty optional link to null rather than an empty string", () => {
			expect(toWirePayload(formPayload({ link_url: "" })).link_url).toBeNull()
			expect(toWirePayload(formPayload({ link_url: "   " })).link_url).toBeNull()
			expect(toWirePayload(formPayload({ link_url: "http://api.test/x" })).link_url).toBe("http://api.test/x")
		})

		it("sends every field the update endpoint requires, not just the changed ones", () => {
			expect(Object.keys(toWirePayload(formPayload())).sort()).toEqual([
				"ends_at",
				"image_url",
				"is_active",
				"link_url",
				"sort_order",
				"starts_at",
				"type"
			])
		})
	})
})
