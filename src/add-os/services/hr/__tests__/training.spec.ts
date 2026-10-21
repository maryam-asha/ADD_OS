import { beforeEach, describe, expect, it, vi } from "vitest"
import * as hr from "../training"

const { getMock, postMock, patchMock, delMock } = vi.hoisted(() => ({ getMock: vi.fn(), postMock: vi.fn(), patchMock: vi.fn(), delMock: vi.fn() }))

vi.mock("../../api", () => ({ get: getMock, post: postMock, patch: patchMock, del: delMock }))

const BASE = "/api/v1/hr"
const page = { data: [], meta: { current_page: 1, last_page: 1, per_page: 50, total: 0 } }

describe("hr training service", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		getMock.mockResolvedValue(page)
		postMock.mockResolvedValue({ message: "ok" })
		patchMock.mockResolvedValue({ message: "ok" })
	})

	it("reads the catalogue, narrowed to active or not, and keeps it", async () => {
		getMock.mockResolvedValueOnce({ data: [{ id: 1 }] }).mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({ data: [] })
		const course = {
			code: "barista-101",
			title: { ar: "أساسيات الباريستا", en: null },
			description: null,
			provider: null,
			delivery: "in_person" as const,
			duration_hours: 12,
			cost: 50,
			currency: "USD",
			certification_name: { ar: "شهادة باريستا", en: null },
			certification_valid_months: 12,
			is_active: true
		}
		postMock.mockResolvedValueOnce({ data: { id: 2 } })

		await expect(hr.listCourses()).resolves.toEqual([{ id: 1 }])
		await hr.listCourses({ is_active: true })
		await hr.listCourses({ is_active: false })
		await hr.createCourse(course)
		await hr.updateCourse(2, { is_active: false })

		expect(getMock).toHaveBeenNthCalledWith(1, `${BASE}/courses`, undefined)
		expect(getMock).toHaveBeenNthCalledWith(2, `${BASE}/courses`, { is_active: 1 })
		expect(getMock).toHaveBeenNthCalledWith(3, `${BASE}/courses`, { is_active: 0 })
		expect(postMock).toHaveBeenCalledWith(`${BASE}/courses`, course)
		expect(patchMock).toHaveBeenCalledWith(`${BASE}/courses/2`, { is_active: false })
	})

	it("schedules, enrolls into, completes and cancels sessions", async () => {
		postMock.mockResolvedValueOnce({ data: [{ id: 30 }, { id: 31 }] })

		await hr.listSessions({ status: "scheduled", course_id: null, from: "2026-03-01" })
		await expect(hr.enrollEmployees(4, [7, 9])).resolves.toEqual([{ id: 30 }, { id: 31 }])
		await hr.completeSession(4, { no_show_ids: [31], scores: [{ enrollment_id: 30, score: 92 }] })
		await hr.cancelEnrollment(30)
		await hr.cancelSession(4)

		expect(getMock).toHaveBeenCalledWith(`${BASE}/training-sessions`, { page: 1, status: "scheduled", from: "2026-03-01" })
		expect(postMock).toHaveBeenCalledWith(`${BASE}/training-sessions/4/enrollments`, { employee_ids: [7, 9] })
		expect(postMock).toHaveBeenCalledWith(`${BASE}/training-sessions/4/complete`, { no_show_ids: [31], scores: [{ enrollment_id: 30, score: 92 }] })
		expect(postMock).toHaveBeenCalledWith(`${BASE}/enrollments/30/cancel`)
		expect(postMock).toHaveBeenCalledWith(`${BASE}/training-sessions/4/cancel`)
	})

	it("records certifications on the file and filters them by expiry", async () => {
		postMock.mockResolvedValueOnce({ data: { id: 8 } })
		delMock.mockResolvedValue(undefined)
		const certification = { name: { ar: "إسعافات أولية", en: null }, course_id: null, issuer: "Red Crescent", issued_on: "2026-01-10", expires_on: "2028-01-10", reference: null }

		await hr.listCertifications({ employee_id: 7, expires_before: "2026-12-31" })
		await hr.recordCertification(7, certification)
		await hr.updateCertification(8, { reference: "RC-12" })
		await expect(hr.deleteCertification(8)).resolves.toEqual({})

		expect(getMock).toHaveBeenCalledWith(`${BASE}/certifications`, { page: 1, employee_id: 7, expires_before: "2026-12-31" })
		expect(postMock).toHaveBeenCalledWith(`${BASE}/employees/7/certifications`, certification)
		expect(patchMock).toHaveBeenCalledWith(`${BASE}/certifications/8`, { reference: "RC-12" })
		expect(delMock).toHaveBeenCalledWith(`${BASE}/certifications/8`)
	})

	it("allocates to everyone or to those chosen, and adjusts with a note", async () => {
		getMock.mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({ data: { year: 2026, balance: "300", available: "50", currency: "USD", entries: [] } })

		await hr.listBudgets(2026)
		await expect(hr.getEmployeeBudget(7, 2026)).resolves.toMatchObject({ available: "50" })
		await hr.allocateBudget(2026, 300, null)
		await hr.allocateBudget(2026, 300, [7])
		await hr.adjustBudget(7, 2026, -100, "Shared course paid")

		expect(getMock).toHaveBeenNthCalledWith(1, `${BASE}/learning-budgets`, { year: 2026 })
		expect(getMock).toHaveBeenNthCalledWith(2, `${BASE}/employees/7/learning-budget`, { year: 2026 })
		expect(postMock).toHaveBeenCalledWith(`${BASE}/learning-budgets/allocate`, { year: 2026, amount: 300 })
		expect(postMock).toHaveBeenCalledWith(`${BASE}/learning-budgets/allocate`, { year: 2026, amount: 300, employee_ids: [7] })
		expect(postMock).toHaveBeenCalledWith(`${BASE}/employees/7/learning-budget/adjust`, { year: 2026, amount: -100, note: "Shared course paid" })
	})

	it("is the employee's own side under hr/me", async () => {
		getMock.mockResolvedValue({ data: [] })
		postMock.mockResolvedValueOnce({ data: { id: 30 } }).mockResolvedValueOnce({ message: "ok" }).mockResolvedValueOnce({ data: { id: 5 } })
		const request = { course_id: null, title: "Latte art course", provider: "Coffee Lab", starts_on: null, amount: 250, justification: null }

		await hr.openSessions()
		await hr.enrollMe(4)
		await hr.cancelMyEnrollment(30)
		await hr.myEnrollments()
		await hr.myCertifications()
		await hr.myBudget()
		await hr.myLearningRequests()
		await hr.requestLearning(request)
		await hr.cancelLearningRequest(5)

		expect(getMock.mock.calls.map(c => c[0])).toEqual([
			`${BASE}/me/training-sessions`,
			`${BASE}/me/enrollments`,
			`${BASE}/me/certifications`,
			`${BASE}/me/learning-budget`,
			`${BASE}/me/learning-requests`
		])
		expect(postMock).toHaveBeenCalledWith(`${BASE}/me/training-sessions/4/enroll`)
		expect(postMock).toHaveBeenCalledWith(`${BASE}/me/enrollments/30/cancel`)
		expect(postMock).toHaveBeenCalledWith(`${BASE}/me/learning-requests`, request)
		expect(postMock).toHaveBeenCalledWith(`${BASE}/me/learning-requests/5/cancel`)
	})
})
