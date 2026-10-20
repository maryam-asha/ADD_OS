import { beforeEach, describe, expect, it, vi } from "vitest"
import * as hr from "../performance"

const { getMock, postMock, putMock, patchMock, delMock } = vi.hoisted(() => ({ getMock: vi.fn(), postMock: vi.fn(), putMock: vi.fn(), patchMock: vi.fn(), delMock: vi.fn() }))

vi.mock("../../api", () => ({ get: getMock, post: postMock, put: putMock, patch: patchMock, del: delMock }))

const BASE = "/api/v1/hr"
const page = { data: [], meta: { current_page: 1, last_page: 1, per_page: 50, total: 0 } }

describe("hr performance service", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		getMock.mockResolvedValue(page)
		postMock.mockResolvedValue({ message: "ok" })
		patchMock.mockResolvedValue({ message: "ok" })
		putMock.mockResolvedValue({ message: "ok" })
	})

	it("manages templates", async () => {
		getMock.mockResolvedValueOnce({ data: [{ id: 1 }] })
		postMock.mockResolvedValueOnce({ data: { id: 2 } })
		const template = { name: { ar: "سنوي" }, scale_max: 5, competencies: [{ code: "teamwork", name: { ar: "العمل الجماعي" }, weight: null }], goals_weight: 40, is_active: true }

		await expect(hr.listTemplates()).resolves.toEqual([{ id: 1 }])
		await hr.createTemplate(template)
		await hr.updateTemplate(2, { is_active: false })

		expect(postMock).toHaveBeenCalledWith(`${BASE}/review-templates`, template)
		expect(patchMock).toHaveBeenCalledWith(`${BASE}/review-templates/2`, { is_active: false })
	})

	it("runs a cycle through its phases and works its reviews", async () => {
		await hr.listCycles({ status: "calibration" })
		await hr.launchCycle(3)
		await hr.advanceCycle(3)
		await hr.listCycleReviews(3, { status: null, reviewer_id: 7 })
		postMock.mockResolvedValueOnce({ data: { id: 40 } })
		await hr.addToCycle(3, 9)
		await hr.reassignReviewer(40, 7)
		await hr.calibrateReview(40, 3.5, "Below the unit's average")

		expect(getMock).toHaveBeenNthCalledWith(1, `${BASE}/review-cycles`, { page: 1, status: "calibration" })
		expect(postMock).toHaveBeenCalledWith(`${BASE}/review-cycles/3/launch`)
		expect(postMock).toHaveBeenCalledWith(`${BASE}/review-cycles/3/advance`)
		expect(getMock).toHaveBeenNthCalledWith(2, `${BASE}/review-cycles/3/reviews`, { page: 1, reviewer_id: 7 })
		expect(postMock).toHaveBeenCalledWith(`${BASE}/review-cycles/3/reviews`, { employee_id: 9 })
		expect(patchMock).toHaveBeenCalledWith(`${BASE}/reviews/40`, { reviewer_id: 7 })
		expect(postMock).toHaveBeenCalledWith(`${BASE}/reviews/40/calibrate`, { score: 3.5, note: "Below the unit's average" })
	})

	it("sets, updates and deletes goals for HR", async () => {
		postMock.mockResolvedValueOnce({ data: { id: 5 } })
		delMock.mockResolvedValue(undefined)
		const goal = { title: "Raise occupancy", description: null, metric: "Occupancy", target: "85%", weight: 40, progress: 0, due_on: null, review_cycle_id: 3 }

		await hr.listGoals({ employee_id: 7, status: null })
		await hr.createGoal(7, goal)
		await hr.updateGoal(5, { progress: 60 })
		await expect(hr.deleteGoal(5)).resolves.toEqual({})

		expect(getMock).toHaveBeenCalledWith(`${BASE}/goals`, { page: 1, employee_id: 7 })
		expect(postMock).toHaveBeenCalledWith(`${BASE}/employees/7/goals`, goal)
		expect(patchMock).toHaveBeenCalledWith(`${BASE}/goals/5`, { progress: 60 })
		expect(delMock).toHaveBeenCalledWith(`${BASE}/goals/5`)
	})

	it("serves the employee and the manager", async () => {
		getMock.mockResolvedValue({ data: [] })
		const answers = { answers: [{ kind: "competency" as const, key: "teamwork", rating: 4, comment: null }], comment: null }

		await hr.myGoals()
		await hr.myGoals(9)
		await hr.myReviews()
		await hr.submitSelfReview(40, answers)
		await hr.teamReviews()
		await hr.submitManagerReview(41, { ...answers, recommendation: "promotion" })

		expect(getMock).toHaveBeenNthCalledWith(1, `${BASE}/me/goals`, undefined)
		expect(getMock).toHaveBeenNthCalledWith(2, `${BASE}/me/goals`, { employee_id: 9 })
		expect(putMock).toHaveBeenNthCalledWith(1, `${BASE}/me/reviews/40/self`, answers)
		expect(putMock).toHaveBeenNthCalledWith(2, `${BASE}/me/team-reviews/41`, { ...answers, recommendation: "promotion" })
	})
})
