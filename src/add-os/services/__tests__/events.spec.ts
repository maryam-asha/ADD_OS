import { beforeEach, describe, expect, it, vi } from "vitest"
import { createEvent, getEvent, listEvents, removeEvent, updateEvent } from "../events"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const sampleEvent = {
	id: 1,
	title: { ar: "فعالية تقنية", en: "Tech Talk" },
	description: { ar: "شرح كامل", en: "Full details" },
	category: { ar: "ورشة عمل", en: "Workshop" },
	start_at: "2026-10-01 10:00:00",
	end_at: "2026-10-01 12:00:00",
	location: "Main Hall",
	capacity: 50,
	status: "published" as const,
	order: 1,
	created_at: "2026-09-03T12:00:00Z"
}

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("events service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("listEvents GETs the collection and unwraps it", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleEvent] }))

		const events = await listEvents()

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/events", expect.objectContaining({ method: "GET" }))
		expect(events).toEqual([sampleEvent])
	})

	it("getEvent GETs a single event by id", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleEvent }))

		const event = await getEvent(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/events/1", expect.objectContaining({ method: "GET" }))
		expect(event).toEqual(sampleEvent)
	})

	it("createEvent POSTs payload and unwraps created entity", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleEvent }, 201))

		const payload = {
			title: { ar: "فعالية تقنية", en: "Tech Talk" },
			start_at: "2026-10-01 10:00:00",
			end_at: "2026-10-01 12:00:00",
			status: "published" as const,
			order: 1
		}

		const created = await createEvent(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/events",
			expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
		)
		expect(created).toEqual(sampleEvent)
	})

	it("updateEvent PUTs the payload to /admin/events/:id", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Event updated." }))

		const payload = {
			title: { ar: "عنوان محدث", en: "Updated Title" },
			start_at: "2026-10-01 10:00:00",
			end_at: "2026-10-01 12:00:00",
			status: "published" as const,
			order: 1
		}

		const res = await updateEvent(1, payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/events/1",
			expect.objectContaining({ method: "PUT", body: JSON.stringify(payload) })
		)
		expect(res).toEqual({ message: "Event updated." })
	})

	it("removeEvent DELETEs the event by id", async () => {
		vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))

		await removeEvent(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/events/1", expect.objectContaining({ method: "DELETE" }))
	})
})
