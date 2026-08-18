import { beforeEach, describe, expect, it, vi } from "vitest"

import { assignRole, createUser, getUser, listUsers, updateUserProfile, updateUserStatus } from "../users"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const sampleUser = {
	id: 1,
	name: "Rana Khoury",
	phone: "0988877766",
	email: "rana.khoury@add.local",
	preferred_language: "ar",
	preferred_currency: "SYP",
	status: "active",
	roles: ["operations"]
}

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("users service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("listUsers GETs the collection and unwraps it", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleUser] }))

		const users = await listUsers()

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/users", expect.objectContaining({ method: "GET" }))
		expect(users).toEqual([sampleUser])
	})

	it("listUsers appends ?role= when a filter is passed", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleUser] }))

		await listUsers({ role: "operations" })

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/users?role=operations",
			expect.objectContaining({ method: "GET" })
		)
	})

	it("createUser POSTs the payload and unwraps the single resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleUser }, 201))

		const payload = {
			name: "Rana Khoury",
			phone: "0988877766",
			email: "rana.khoury@add.local",
			password: "a-strong-password",
			password_confirmation: "a-strong-password",
			role: "operations" as const
		}
		const user = await createUser(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/users",
			expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
		)
		expect(user).toEqual(sampleUser)
	})

	it("getUser GETs a single resource by id", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleUser }))

		const user = await getUser(1)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/users/1", expect.objectContaining({ method: "GET" }))
		expect(user).toEqual(sampleUser)
	})

	// updateUserProfile/updateUserStatus/assignRole are typed Promise<void>: live-testing
	// against the real backend (see docs/add-os/auth-verification-report.md) showed every
	// one of these three PATCH/PUT endpoints returns `{"message": "..."}`, never the
	// updated user — matching the Postman collection's own documented behavior. A prior
	// version of this file (and of these three functions) assumed a `{data: User}`
	// envelope instead, which would have resolved `res.data` to `undefined` against the
	// real API despite the `Promise<User>` return type. `api.ts`'s `request()` still
	// JSON-parses and returns whatever body comes back regardless of the caller's declared
	// generic — `void` is a type-level "don't rely on this," not a runtime guarantee the
	// value is actually `undefined` — so these tests only assert the call resolves and
	// hits the right endpoint, not what it resolves to.

	it("updateUserProfile PUTs the profile fields", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "تم تحديث بيانات المستخدم." }))

		const payload = { name: "Rana Khoury-Haddad", phone: "0988877766", email: "rana.khoury@add.local" }
		await updateUserProfile(1, payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/users/1",
			expect.objectContaining({ method: "PUT", body: JSON.stringify(payload) })
		)
	})

	it("updateUserStatus PATCHes the status endpoint", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "تم تحديث حالة المستخدم." }))

		const payload = { status: "deactivated" as const, reason: "left the company" }
		await updateUserStatus(1, payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/users/1/status",
			expect.objectContaining({ method: "PATCH", body: JSON.stringify(payload) })
		)
	})

	it("assignRole PATCHes the role endpoint with { role }", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "تم تحديث دور المستخدم." }))

		await assignRole(1, "admin")

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/users/1/role",
			expect.objectContaining({ method: "PATCH", body: JSON.stringify({ role: "admin" }) })
		)
	})

	it("propagates ApiError with validation errors on a 422", async () => {
		vi.mocked(fetch).mockResolvedValue(
			jsonResponse({ message: "The given data was invalid.", errors: { phone: ["The phone has already been taken."] } }, 422)
		)

		await expect(
			createUser({
				name: "Rana Khoury",
				phone: "0988877766",
				email: "rana.khoury@add.local",
				password: "a-strong-password",
				password_confirmation: "a-strong-password",
				role: "operations"
			})
		).rejects.toMatchObject({ status: 422, data: { errors: { phone: ["The phone has already been taken."] } } })
	})
})
