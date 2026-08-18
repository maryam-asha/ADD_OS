import { beforeEach, describe, expect, it, vi } from "vitest"

import {
	createPrivateOfficeRequest,
	getPrivateOfficeRequest,
	listPrivateOfficeRequests,
	markPrivateOfficeRequestAsQuoted,
	removePrivateOfficeRequest
} from "../private-office-requests"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const sampleRequest = {
	id: 1,
	prospect_name: "Levant Textiles LLC",
	contact: "+963 999 111 222",
	status: "requested",
	quote_ref: null
}

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("private office requests service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("listPrivateOfficeRequests GETs the collection and unwraps it", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleRequest] }))

		const requests = await listPrivateOfficeRequests()

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/private-office-requests",
			expect.objectContaining({ method: "GET" })
		)
		expect(requests).toEqual([sampleRequest])
	})

	it("createPrivateOfficeRequest POSTs the payload and unwraps the created resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleRequest }, 201))

		const payload = { prospect_name: sampleRequest.prospect_name, contact: sampleRequest.contact }
		const request = await createPrivateOfficeRequest(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/private-office-requests",
			expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
		)
		expect(request).toEqual(sampleRequest)
	})

	it("getPrivateOfficeRequest GETs a single resource by id", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleRequest }))

		const request = await getPrivateOfficeRequest(1)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/private-office-requests/1",
			expect.objectContaining({ method: "GET" })
		)
		expect(request).toEqual(sampleRequest)
	})

	it("markPrivateOfficeRequestAsQuoted PUTs a fixed status:quoted alongside the quote_ref, and returns only the message", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Updated." }))

		const result = await markPrivateOfficeRequestAsQuoted(1, { quote_ref: "Q-2026-0001" })

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/private-office-requests/1",
			expect.objectContaining({ method: "PUT", body: JSON.stringify({ status: "quoted", quote_ref: "Q-2026-0001" }) })
		)
		expect(result).toEqual({ message: "Updated." })
	})

	it("removePrivateOfficeRequest DELETEs the resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Deleted." }))

		const result = await removePrivateOfficeRequest(1)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/private-office-requests/1",
			expect.objectContaining({ method: "DELETE" })
		)
		expect(result).toEqual({ message: "Deleted." })
	})
})
