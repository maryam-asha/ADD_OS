import { beforeEach, describe, expect, it, vi } from "vitest"
import {
	createCommunityMember,
	getCommunityMember,
	listCommunityMembers,
	removeCommunityMember,
	updateCommunityMember
} from "../community-members"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const sampleMember = {
	id: 5,
	name: { ar: "أحمد الحلبي", en: "Ahmad Halabi" },
	category: "pioneers" as const,
	company: { ar: "شركة البرمجيات", en: "Software Co" },
	title: { ar: "مطور برمجيات", en: "Software Engineer" },
	bio: { ar: "نبذة", en: "Bio" },
	long_bio: { ar: "نبذة طويلة", en: "Long bio" },
	year_joined: 2024,
	photo_url: "/storage/uploads/photo.jpg",
	order: 1,
	published: true
}

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("community-members service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("listCommunityMembers GETs collection and unwraps data", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleMember] }))

		const members = await listCommunityMembers()

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/community-members",
			expect.objectContaining({ method: "GET" })
		)
		expect(members).toEqual([sampleMember])
	})

	it("getCommunityMember GETs single record by id", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleMember }))

		const member = await getCommunityMember(5)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/community-members/5",
			expect.objectContaining({ method: "GET" })
		)
		expect(member).toEqual(sampleMember)
	})

	it("createCommunityMember POSTs payload", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleMember }, 201))

		const payload = {
			name: { ar: "أحمد", en: "Ahmad" },
			category: "pioneers" as const,
			order: 1,
			published: true
		}

		const created = await createCommunityMember(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/community-members",
			expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
		)
		expect(created).toEqual(sampleMember)
	})

	it("updateCommunityMember PUTs payload", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Updated." }))

		const payload = {
			name: { ar: "أحمد محدث", en: "Ahmad Updated" },
			category: "pioneers" as const,
			order: 1,
			published: true
		}

		const res = await updateCommunityMember(5, payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/community-members/5",
			expect.objectContaining({ method: "PUT", body: JSON.stringify(payload) })
		)
		expect(res).toEqual({ message: "Updated." })
	})

	it("removeCommunityMember DELETEs resource by id", async () => {
		vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))

		await removeCommunityMember(5)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/community-members/5",
			expect.objectContaining({ method: "DELETE" })
		)
	})
})
