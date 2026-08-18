import { beforeEach, describe, expect, it, vi } from "vitest"

import { createCompanyMembersApi } from "../company-members"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const sampleMember = { user_id: 5, door_access_enabled: true, is_admin: false }

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("company members nested service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("list() GETs /companies/{id}/members and unwraps it", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleMember] }))

		const members = await createCompanyMembersApi(3).list()

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/companies/3/members",
			expect.objectContaining({ method: "GET" })
		)
		expect(members).toEqual([sampleMember])
	})

	it("add() POSTs the payload and unwraps the created member", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleMember }, 201))

		const payload = { user_id: 5, door_access_enabled: true, is_admin: false }
		const member = await createCompanyMembersApi(3).add(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/companies/3/members",
			expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
		)
		expect(member).toEqual(sampleMember)
	})

	it("updateDoorAccess() PATCHes /members/{userId} and returns only the message", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Updated." }))

		const result = await createCompanyMembersApi(3).updateDoorAccess(5, { door_access_enabled: false })

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/companies/3/members/5",
			expect.objectContaining({ method: "PATCH", body: JSON.stringify({ door_access_enabled: false }) })
		)
		expect(result).toEqual({ message: "Updated." })
	})

	it("updateAdminFlag() PATCHes /members/{userId}/admin and returns only the message", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Updated." }))

		const result = await createCompanyMembersApi(3).updateAdminFlag(5, { is_admin: true })

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/companies/3/members/5/admin",
			expect.objectContaining({ method: "PATCH", body: JSON.stringify({ is_admin: true }) })
		)
		expect(result).toEqual({ message: "Updated." })
	})

	it("remove() DELETEs /members/{userId}", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Deleted." }))

		const result = await createCompanyMembersApi(3).remove(5)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/companies/3/members/5",
			expect.objectContaining({ method: "DELETE" })
		)
		expect(result).toEqual({ message: "Deleted." })
	})

	it("binds a different companyId per call — no shared base path", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [] }))

		await createCompanyMembersApi(7).list()

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/companies/7/members",
			expect.objectContaining({ method: "GET" })
		)
	})
})
