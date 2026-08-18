import { beforeEach, describe, expect, it, vi } from "vitest"

import { createCompany, getCompany, listCompanies, updateCompanyStatus } from "../companies"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const sampleCompany = {
	id: 1,
	private_office_request_id: 1,
	legal_name: "Levant Textiles LLC",
	contract_ref: "C-2026-0001",
	branch_id: 1,
	status: "active"
}

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("companies service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("listCompanies GETs the collection and unwraps it", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleCompany] }))

		const companies = await listCompanies()

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/companies", expect.objectContaining({ method: "GET" }))
		expect(companies).toEqual([sampleCompany])
	})

	it("createCompany POSTs the payload and unwraps the created resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleCompany }, 201))

		const payload = {
			private_office_request_id: 1,
			legal_name: sampleCompany.legal_name,
			contract_ref: sampleCompany.contract_ref,
			branch_id: 1
		}
		const company = await createCompany(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/companies",
			expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
		)
		expect(company).toEqual(sampleCompany)
	})

	it("getCompany GETs a single resource by id", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleCompany }))

		const company = await getCompany(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/companies/1", expect.objectContaining({ method: "GET" }))
		expect(company).toEqual(sampleCompany)
	})

	it("updateCompanyStatus PATCHes /status and returns only the message", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Updated." }))

		const result = await updateCompanyStatus(1, { status: "inactive" })

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/companies/1/status",
			expect.objectContaining({ method: "PATCH", body: JSON.stringify({ status: "inactive" }) })
		)
		expect(result).toEqual({ message: "Updated." })
	})
})
