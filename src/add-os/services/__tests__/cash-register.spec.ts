import { beforeEach, describe, expect, it, vi } from "vitest"
import {
	closeCashRegisterSession,
	getCurrentSession,
	listCashRegisterSessions,
	openCashRegisterSession
} from "../cash-register"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const sampleSession = {
	id: 10,
	user_id: 1,
	operator_name: "Admin User",
	branch_id: 1,
	branch_name: "Main Branch",
	status: "open" as const,
	opened_at: "2026-09-03T10:00:00Z",
	closed_at: null,
	opening_balance: "500000.00",
	closing_balance: null,
	expected_balance: null,
	difference: null,
	notes: "Morning shift",
	created_at: "2026-09-03T10:00:00Z"
}

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("cash register service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("getCurrentSession fetches current open session", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleSession }))

		const session = await getCurrentSession()

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/reception/cash-register-sessions/current",
			expect.objectContaining({ method: "GET" })
		)
		expect(session).toEqual(sampleSession)
	})

	it("getCurrentSession returns null when no open session exists", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: null }))

		const session = await getCurrentSession()
		expect(session).toBeNull()
	})

	it("openCashRegisterSession POSTs payload to open endpoint", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleSession }, 201))

		const payload = { branch_id: 1, opening_balance: "500000.00", notes: "Morning shift" }
		const session = await openCashRegisterSession(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/reception/cash-register-sessions/open",
			expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
		)
		expect(session).toEqual(sampleSession)
	})

	it("closeCashRegisterSession POSTs payload to close endpoint", async () => {
		const closed = { ...sampleSession, status: "closed" as const, closing_balance: "650000.00" }
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: closed }))

		const payload = { closing_balance: "650000.00", notes: "Closing shift" }
		const session = await closeCashRegisterSession(10, payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/reception/cash-register-sessions/10/close",
			expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
		)
		expect(session).toEqual(closed)
	})

	it("listCashRegisterSessions GETs collection with params", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleSession] }))

		const res = await listCashRegisterSessions({ branch_id: 1 })

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/reception/cash-register-sessions?branch_id=1",
			expect.objectContaining({ method: "GET" })
		)
		expect(res.data).toEqual([sampleSession])
	})
})
