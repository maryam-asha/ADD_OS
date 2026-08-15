import { beforeEach, describe, expect, it, vi } from "vitest"

import { createSeatDesk, getSeatDesk, listSeatsDesks, removeSeatDesk, updateSeatDesk } from "../seats-desks"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const sampleSeatDesk = { id: 1, space_id: 1, label: "D-12", qr_point_id: null }

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("seats-desks service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("listSeatsDesks GETs the collection with no filter by default", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleSeatDesk] }))

		const seatsDesks = await listSeatsDesks()

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/seats-desks", expect.objectContaining({ method: "GET" }))
		expect(seatsDesks).toEqual([sampleSeatDesk])
	})

	it("listSeatsDesks(spaceId) appends ?space_id=", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleSeatDesk] }))

		await listSeatsDesks(1)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/seats-desks?space_id=1",
			expect.objectContaining({ method: "GET" })
		)
	})

	it("createSeatDesk POSTs the payload and unwraps the created resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleSeatDesk }, 201))

		const payload = { space_id: 1, label: "D-12", qr_point_id: null }
		const seatDesk = await createSeatDesk(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/seats-desks",
			expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
		)
		expect(seatDesk).toEqual(sampleSeatDesk)
	})

	it("getSeatDesk GETs a single resource by id", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleSeatDesk }))

		const seatDesk = await getSeatDesk(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/seats-desks/1", expect.objectContaining({ method: "GET" }))
		expect(seatDesk).toEqual(sampleSeatDesk)
	})

	it("updateSeatDesk PUTs the payload and returns the message body only", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Updated." }))

		const payload = { space_id: 1, label: "D-99", qr_point_id: 4 }
		const result = await updateSeatDesk(1, payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/seats-desks/1",
			expect.objectContaining({ method: "PUT", body: JSON.stringify(payload) })
		)
		expect(result).toEqual({ message: "Updated." })
	})

	it("removeSeatDesk DELETEs the resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Deleted." }))

		const result = await removeSeatDesk(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/seats-desks/1", expect.objectContaining({ method: "DELETE" }))
		expect(result).toEqual({ message: "Deleted." })
	})
})
