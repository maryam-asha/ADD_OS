import { beforeEach, describe, expect, it, vi } from "vitest"
import {
	approveAttendee,
	createEvent,
	createRegistrationField,
	getEvent,
	listAttendees,
	listEvents,
	listPendingAttendees,
	listRegistrationFields,
	rejectAttendee,
	rejectPendingAttendees,
	removeEvent,
	removeRegistrationField,
	updateEvent,
	updateRegistrationField
} from "../events"

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

describe("event registration form", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("lists every field, active or not — this is the editor", async () => {
		const field = { id: 3, key: "company", label: "Company", type: "text", is_required: false, is_active: false, order: 0 }
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [field] }))

		const fields = await listRegistrationFields(7)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/events/7/registration-fields",
			expect.objectContaining({ method: "GET" })
		)
		expect(fields).toEqual([field])
	})

	it("creates a field and unwraps the created row", async () => {
		const created = { id: 9, key: "dietary_needs", label: "Dietary needs", type: "text", is_required: false, is_active: true, order: 0 }
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: created }, 201))

		const field = await createRegistrationField(7, {
			key: "dietary_needs",
			label: { ar: "احتياجات", en: "Dietary needs" },
			type: "text"
		})

		const [url, init] = vi.mocked(fetch).mock.calls[0]
		expect(url).toBe("http://api.test/api/v1/admin/events/7/registration-fields")
		expect((init as RequestInit).method).toBe("POST")
		expect(field).toEqual(created)
	})

	it("updates a field with PATCH, nested under its own event", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "ok" }))

		await updateRegistrationField(7, 9, { is_active: false })

		const [url, init] = vi.mocked(fetch).mock.calls[0]
		expect(url).toBe("http://api.test/api/v1/admin/events/7/registration-fields/9")
		expect((init as RequestInit).method).toBe("PATCH")
	})

	it("deletes a field", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "ok" }))

		await removeRegistrationField(7, 9)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/events/7/registration-fields/9",
			expect.objectContaining({ method: "DELETE" })
		)
	})
})

describe("event attendees and approval", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	const attendee = {
		id: 4,
		event_id: 7,
		user_id: 11,
		name: "Member",
		email: "m@example.com",
		status: "pending" as const
	}

	it("keeps meta when listing attendees — the roster really does page", async () => {
		vi.mocked(fetch).mockResolvedValue(
			jsonResponse({ data: [attendee], meta: { current_page: 1, last_page: 3, per_page: 20, total: 47 } })
		)

		const page = await listAttendees(7)

		expect(page.data).toEqual([attendee])
		expect(page.meta.last_page).toBe(3)
	})

	it("passes a status filter through as a query parameter", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } }))

		await listAttendees(7, { status: "rejected" })

		expect(vi.mocked(fetch).mock.calls[0][0]).toContain("status=rejected")
	})

	it("reads the pending queue from its own endpoint", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [attendee], meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 } }))

		await listPendingAttendees(7)

		expect(vi.mocked(fetch).mock.calls[0][0]).toBe("http://api.test/api/v1/admin/events/7/attendees/pending")
	})

	it("approves one registration", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "approved" }))

		await approveAttendee(7, 4)

		const [url, init] = vi.mocked(fetch).mock.calls[0]
		expect(url).toBe("http://api.test/api/v1/admin/events/7/attendees/4/approve")
		expect((init as RequestInit).method).toBe("POST")
	})

	it("sends the reason when rejecting — the API refuses an empty one", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "rejected" }))

		await rejectAttendee(7, 4, "Not eligible")

		const [url, init] = vi.mocked(fetch).mock.calls[0]
		expect(url).toBe("http://api.test/api/v1/admin/events/7/attendees/4/reject")
		expect(JSON.parse((init as RequestInit).body as string)).toEqual({ rejection_reason: "Not eligible" })
	})

	it("closes out the whole pending queue in one call", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "done", rejected_count: 3 }))

		await rejectPendingAttendees(7, "Review closed")

		const [url, init] = vi.mocked(fetch).mock.calls[0]
		expect(url).toBe("http://api.test/api/v1/admin/events/7/attendees/reject-pending")
		expect(JSON.parse((init as RequestInit).body as string)).toEqual({ rejection_reason: "Review closed" })
	})
})
