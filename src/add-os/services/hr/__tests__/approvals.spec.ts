import { beforeEach, describe, expect, it, vi } from "vitest"
import * as approvals from "../approvals"

const { getMock, postMock, patchMock, delMock } = vi.hoisted(() => ({ getMock: vi.fn(), postMock: vi.fn(), patchMock: vi.fn(), delMock: vi.fn() }))

vi.mock("../../api", () => ({ get: getMock, post: postMock, patch: patchMock, del: delMock }))

const BASE = "/api/v1/hr"
const page = { data: [{ id: 1 }], meta: { current_page: 1, last_page: 2, per_page: 25, total: 30 } }

describe("hr approvals service", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("reads the request types and the flows", async () => {
		getMock.mockResolvedValueOnce({ data: ["leave", "loan"] }).mockResolvedValueOnce({ data: [{ id: 1 }] })

		await expect(approvals.listApprovalTypes()).resolves.toEqual(["leave", "loan"])
		await expect(approvals.listApprovalFlows()).resolves.toEqual([{ id: 1 }])
		expect(getMock).toHaveBeenNthCalledWith(1, `${BASE}/approval-types`)
		expect(getMock).toHaveBeenNthCalledWith(2, `${BASE}/approval-flows`)
	})

	it("creates, updates and deletes a flow", async () => {
		postMock.mockResolvedValue({ data: { id: 3 } })
		patchMock.mockResolvedValue({ message: "ok" })
		delMock.mockResolvedValue(undefined)
		const steps = [{ approver: "direct_manager" as const, timeout_hours: 48, on_timeout: "escalate" as const }, { approver: "ability" as const, ability: "hr.leave.manage" }]

		await approvals.createApprovalFlow({ request_type: "leave", name: null, steps, is_active: true })
		await approvals.updateApprovalFlow(3, { name: null, steps, is_active: false })
		await approvals.deleteApprovalFlow(3)

		expect(postMock).toHaveBeenCalledWith(`${BASE}/approval-flows`, { request_type: "leave", name: null, steps, is_active: true })
		expect(patchMock).toHaveBeenCalledWith(`${BASE}/approval-flows/3`, { name: null, steps, is_active: false })
		expect(delMock).toHaveBeenCalledWith(`${BASE}/approval-flows/3`)
	})

	it("lists every request with only the filters that are set", async () => {
		getMock.mockResolvedValue(page)

		const result = await approvals.listApprovalRequests({ page: 2, status: "pending", request_type: null, employee_id: 7 })

		expect(getMock).toHaveBeenCalledWith(`${BASE}/approval-requests`, { page: 2, status: "pending", employee_id: 7 })
		expect(result.meta.total).toBe(30)
	})

	it("decides as an override on the admin routes, and as the approver on hr/me", async () => {
		postMock.mockResolvedValue({ message: "Approved." })

		await approvals.overrideApprove(4, "away")
		await approvals.overrideReject(4, null)
		await approvals.approveMyApproval(5, null)
		await approvals.rejectMyApproval(5, "month-end")

		expect(postMock).toHaveBeenNthCalledWith(1, `${BASE}/approval-requests/4/approve`, { comment: "away" })
		expect(postMock).toHaveBeenNthCalledWith(2, `${BASE}/approval-requests/4/reject`, { comment: null })
		expect(postMock).toHaveBeenNthCalledWith(3, `${BASE}/me/approvals/5/approve`, { comment: null })
		expect(postMock).toHaveBeenNthCalledWith(4, `${BASE}/me/approvals/5/reject`, { comment: "month-end" })
	})

	it("reads my inbox by page and one request from data", async () => {
		getMock.mockResolvedValueOnce(page).mockResolvedValueOnce({ data: { id: 5 } })

		await approvals.listMyApprovals(2)
		await expect(approvals.getMyApproval(5)).resolves.toEqual({ id: 5 })
		expect(getMock).toHaveBeenNthCalledWith(1, `${BASE}/me/approvals`, { page: 2 })
		expect(getMock).toHaveBeenNthCalledWith(2, `${BASE}/me/approvals/5`)
	})

	it("adds, lists and removes my delegations", async () => {
		getMock.mockResolvedValue({ data: [{ id: 2 }] })
		postMock.mockResolvedValue({ data: { id: 2 } })
		delMock.mockResolvedValue(undefined)
		const payload = { delegate_employee_id: 9, starts_on: "2026-11-01", ends_on: "2026-11-10", request_type: null }

		await expect(approvals.listMyDelegations()).resolves.toEqual([{ id: 2 }])
		await approvals.createDelegation(payload)
		await approvals.deleteDelegation(2)

		expect(postMock).toHaveBeenCalledWith(`${BASE}/me/delegations`, payload)
		expect(delMock).toHaveBeenCalledWith(`${BASE}/me/delegations/2`)
	})
})
