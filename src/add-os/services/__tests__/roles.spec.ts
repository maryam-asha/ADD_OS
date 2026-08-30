import { beforeEach, describe, expect, it, vi } from "vitest"

import { createRole, listRoleRecords, listRoles, removeRole, updateRole } from "../roles"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const sampleRole = { id: 1, name: "operations", protected: true, permissions: ["branches.view"] }
const customRole = { id: 4, name: "front-desk", protected: false, permissions: ["branches.view", "branches.update"] }

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

function emptyResponse(status = 204) {
	return new Response(null, { status })
}

describe("listRoleRecords", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("sends a GET request to the roles endpoint and unwraps the data envelope", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleRole, customRole] }))

		const roles = await listRoleRecords()

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/roles", expect.objectContaining({ method: "GET" }))
		expect(roles).toEqual([sampleRole, customRole])
	})

	it("propagates ApiError on a 403", async () => {
		vi.mocked(fetch).mockResolvedValue(
			jsonResponse({ message: "This action is unauthorized." }, 403)
		)

		await expect(listRoleRecords()).rejects.toMatchObject({ status: 403 })
	})
})

describe("listRoles", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("fetches the role records and maps them down to bare names", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleRole, customRole] }))

		const roles = await listRoles()

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/roles", expect.objectContaining({ method: "GET" }))
		expect(roles).toEqual(["operations", "front-desk"])
	})

	it("propagates ApiError on a 403", async () => {
		vi.mocked(fetch).mockResolvedValue(
			jsonResponse({ message: "This action is unauthorized." }, 403)
		)

		await expect(listRoles()).rejects.toMatchObject({ status: 403 })
	})
})

describe("createRole", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("createRole POSTs the payload and unwraps the created role", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: customRole }, 201))

		const payload = { name: "front-desk", permissions: ["branches.view", "branches.update"] }
		const role = await createRole(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/roles",
			expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
		)
		expect(role).toEqual(customRole)
	})
})

describe("updateRole", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("updateRole PUTs a payload with both name and permissions and returns the message body only", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Updated." }))

		const payload = { name: "front-desk", permissions: ["branches.view"] }
		const result = await updateRole(4, payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/roles/4",
			expect.objectContaining({ method: "PUT", body: JSON.stringify(payload) })
		)
		expect(result).toEqual({ message: "Updated." })
	})

	it("updateRole PUTs a permissions-only payload (no name key) and returns the message body only", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Updated." }))

		const payload = { permissions: ["branches.view", "branches.update"] }
		const result = await updateRole(4, payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/roles/4",
			expect.objectContaining({ method: "PUT", body: JSON.stringify(payload) })
		)
		expect(result).toEqual({ message: "Updated." })
	})

	it("propagates a 422 (e.g. renaming a protected role) as a thrown error", async () => {
		vi.mocked(fetch).mockResolvedValue(
			jsonResponse({ message: "This role is protected and cannot be renamed." }, 422)
		)

		await expect(updateRole(1, { name: "renamed" })).rejects.toMatchObject({
			status: 422,
			data: { message: "This role is protected and cannot be renamed." }
		})
	})
})

describe("removeRole", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("removeRole DELETEs the role and resolves to undefined on a 204/empty response", async () => {
		vi.mocked(fetch).mockResolvedValue(emptyResponse())

		const result = await removeRole(4)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/roles/4", expect.objectContaining({ method: "DELETE" }))
		expect(result).toBeUndefined()
	})

	it("propagates a 422 (e.g. deleting a protected role) as a thrown error", async () => {
		vi.mocked(fetch).mockResolvedValue(
			jsonResponse({ message: "This role is protected and cannot be deleted." }, 422)
		)

		await expect(removeRole(1)).rejects.toMatchObject({
			status: 422,
			data: { message: "This role is protected and cannot be deleted." }
		})
	})
})
