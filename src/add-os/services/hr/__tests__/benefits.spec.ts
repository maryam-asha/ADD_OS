import { beforeEach, describe, expect, it, vi } from "vitest"
import * as hr from "../benefits"

const { getMock, postMock, patchMock, delMock } = vi.hoisted(() => ({ getMock: vi.fn(), postMock: vi.fn(), patchMock: vi.fn(), delMock: vi.fn() }))

vi.mock("../../api", () => ({ get: getMock, post: postMock, patch: patchMock, del: delMock }))

const BASE = "/api/v1/hr"

describe("hr benefits service", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("manages benefits", async () => {
		getMock.mockResolvedValueOnce({ data: [{ id: 1 }] }).mockResolvedValueOnce({ data: { id: 1 } })
		postMock.mockResolvedValue({ data: { id: 2 } })
		patchMock.mockResolvedValue({ message: "The benefit has been updated." })
		delMock.mockResolvedValue(undefined)
		const payload = { code: "cafe-pts", name: { ar: "نقاط المقهى", en: null }, kind: "in_kind_credit" as const, frequency: "monthly" as const, amount: 200, unit: "points", eligible_after_days: 0, is_active: true }

		await expect(hr.listBenefits()).resolves.toEqual([{ id: 1 }])
		await hr.getBenefit(1)
		await hr.createBenefit(payload)
		await hr.updateBenefit(2, { amount: 250, eligible_after_days: 0, is_active: true, name: { ar: "نقاط", en: null } })
		await expect(hr.deleteBenefit(2)).resolves.toEqual({})

		expect(getMock).toHaveBeenNthCalledWith(2, `${BASE}/benefits/1`)
		expect(postMock).toHaveBeenCalledWith(`${BASE}/benefits`, payload)
		expect(patchMock).toHaveBeenCalledWith(`${BASE}/benefits/2`, expect.objectContaining({ amount: 250 }))
		expect(delMock).toHaveBeenCalledWith(`${BASE}/benefits/2`)
	})

	it("assigns, ends and deletes assignments, and reads an employee's benefits as of a date", async () => {
		getMock.mockResolvedValue({ data: [] })
		postMock.mockResolvedValue({ data: { id: 9 } })
		patchMock.mockResolvedValue({ message: "ok" })
		delMock.mockResolvedValue(undefined)
		const assignment = { job_grade_id: 3, amount: null, effective_from: "2026-11-01", effective_to: null }

		await hr.listAssignments(1)
		await hr.assignBenefit(1, assignment)
		await hr.endAssignment(9, "2026-12-31")
		await hr.deleteAssignment(9)
		await hr.employeeBenefits(7, "2026-11-15")
		await hr.employeeBenefits(7)

		expect(getMock).toHaveBeenNthCalledWith(1, `${BASE}/benefits/1/assignments`)
		expect(postMock).toHaveBeenCalledWith(`${BASE}/benefits/1/assignments`, assignment)
		expect(patchMock).toHaveBeenCalledWith(`${BASE}/benefit-assignments/9`, { effective_to: "2026-12-31" })
		expect(delMock).toHaveBeenCalledWith(`${BASE}/benefit-assignments/9`)
		expect(getMock).toHaveBeenNthCalledWith(2, `${BASE}/employees/7/benefits`, { as_of: "2026-11-15" })
		expect(getMock).toHaveBeenNthCalledWith(3, `${BASE}/employees/7/benefits`, undefined)
	})

	it("lists grants with only the filters set, runs, retries and cancels them", async () => {
		getMock.mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 50, total: 0 } })
		postMock.mockResolvedValueOnce({ data: { month: "2026-11", granted: 3, fulfilled: 2, failed: 1 } }).mockResolvedValueOnce({ data: {} }).mockResolvedValue({ data: { id: 4 } })

		await hr.listGrants({ status: "failed", month: "2026-11", benefit_id: null })
		await expect(hr.runGrants("2026-11")).resolves.toEqual({ month: "2026-11", granted: 3, fulfilled: 2, failed: 1 })
		await hr.runGrants()
		await hr.retryGrant(4)
		await hr.cancelGrant(4)

		expect(getMock).toHaveBeenCalledWith(`${BASE}/benefit-grants`, { page: 1, status: "failed", month: "2026-11" })
		expect(postMock).toHaveBeenNthCalledWith(1, `${BASE}/benefit-grants/run`, { month: "2026-11" })
		expect(postMock).toHaveBeenNthCalledWith(2, `${BASE}/benefit-grants/run`, {})
		expect(postMock).toHaveBeenNthCalledWith(3, `${BASE}/benefit-grants/4/retry`)
		expect(postMock).toHaveBeenNthCalledWith(4, `${BASE}/benefit-grants/4/cancel`)
	})

	it("reads the cost report and my benefits", async () => {
		getMock.mockResolvedValue({ data: { month: "2026-10" } })

		await hr.employeeCost("2026-10")
		await hr.myBenefits()

		expect(getMock).toHaveBeenNthCalledWith(1, `${BASE}/reports/employee-cost`, { month: "2026-10" })
		expect(getMock).toHaveBeenNthCalledWith(2, `${BASE}/me/benefits`)
	})
})
