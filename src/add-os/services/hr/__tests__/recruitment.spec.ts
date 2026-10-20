import { beforeEach, describe, expect, it, vi } from "vitest"
import * as hr from "../recruitment"

const { getMock, postMock, putMock, patchMock, delMock, uploadMock } = vi.hoisted(() => ({
	getMock: vi.fn(),
	postMock: vi.fn(),
	putMock: vi.fn(),
	patchMock: vi.fn(),
	delMock: vi.fn(),
	uploadMock: vi.fn()
}))

vi.mock("../../api", () => ({ get: getMock, post: postMock, put: putMock, patch: patchMock, del: delMock, uploadFile: uploadMock }))

const BASE = "/api/v1/hr"
const page = { data: [], meta: { current_page: 1, last_page: 1, per_page: 50, total: 0 } }

describe("hr recruitment service", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		getMock.mockResolvedValue(page)
		postMock.mockResolvedValue({ data: { id: 1 } })
	})

	it("lists with only the filters that are set", async () => {
		await hr.listRequisitions({ status: "approved", org_unit_id: null })
		await hr.listOpenings({ requisition_id: 4 })
		await hr.listCandidates({ search: "" })
		await hr.listApplications({ job_opening_id: 9, page: 2 })

		expect(getMock).toHaveBeenNthCalledWith(1, `${BASE}/requisitions`, { page: 1, status: "approved" })
		expect(getMock).toHaveBeenNthCalledWith(2, `${BASE}/job-openings`, { page: 1, requisition_id: 4 })
		expect(getMock).toHaveBeenNthCalledWith(3, `${BASE}/candidates`, { page: 1 })
		expect(getMock).toHaveBeenNthCalledWith(4, `${BASE}/applications`, { page: 2, job_opening_id: 9 })
	})

	it("sends an application as JSON without a CV, and as multipart with one", async () => {
		uploadMock.mockResolvedValue({ data: { id: 2 } })
		const cv = new File(["%PDF"], "cv.pdf", { type: "application/pdf" })

		await hr.addApplication(9, { name: "Rami", email: null, source: "direct", cover_letter: null })
		await hr.addApplication(9, { candidate_id: 5, source: "referral", referred_by_employee_id: 7, cv })

		expect(postMock).toHaveBeenCalledWith(`${BASE}/job-openings/9/applications`, { name: "Rami", source: "direct" })
		expect(uploadMock).toHaveBeenCalledWith(`${BASE}/job-openings/9/applications`, cv, "cv", { candidate_id: "5", source: "referral", referred_by_employee_id: "7" })
	})

	it("takes an application through its steps", async () => {
		postMock.mockResolvedValue({ message: "ok" })

		await hr.moveApplication(3, "screening", null)
		await hr.rejectApplication(3, "Not the profile")
		await hr.withdrawApplication(3, null)
		await hr.cvLink(3)
		await hr.hireCandidate(3, { hired_on: "2026-12-01", contract: { type: "open_ended" }, assignment: { work_mode: "on_site" } })

		expect(postMock).toHaveBeenNthCalledWith(1, `${BASE}/applications/3/move`, { stage: "screening", note: null })
		expect(postMock).toHaveBeenNthCalledWith(2, `${BASE}/applications/3/reject`, { reason: "Not the profile" })
		expect(postMock).toHaveBeenNthCalledWith(3, `${BASE}/applications/3/withdraw`, { reason: null })
		expect(postMock).toHaveBeenNthCalledWith(4, `${BASE}/applications/3/cv-link`)
		expect(postMock).toHaveBeenNthCalledWith(5, `${BASE}/applications/3/hire`, { hired_on: "2026-12-01", contract: { type: "open_ended" }, assignment: { work_mode: "on_site" } })
	})

	it("schedules interviews and handles offers", async () => {
		const interview = { scheduled_at: "2026-11-03 10:00", duration_minutes: 60, mode: "video" as const, location: null, interviewer_ids: [7, 8], notes: null }
		const offer = { start_on: "2026-12-01", expires_on: null, compensation: [{ pay_component_id: 1, amount: 1200, currency: "USD" }], terms: null }

		await hr.scheduleInterview(3, interview)
		await hr.completeInterview(11)
		await hr.cancelInterview(12)
		await hr.makeOffer(3, offer)
		await hr.acceptOffer(20)
		await hr.declineOffer(21, "Took another job")
		await hr.withdrawOffer(22)

		expect(postMock).toHaveBeenCalledWith(`${BASE}/applications/3/interviews`, interview)
		expect(postMock).toHaveBeenCalledWith(`${BASE}/interviews/11/complete`)
		expect(postMock).toHaveBeenCalledWith(`${BASE}/interviews/12/cancel`)
		expect(postMock).toHaveBeenCalledWith(`${BASE}/applications/3/offers`, offer)
		expect(postMock).toHaveBeenCalledWith(`${BASE}/offers/20/accept`)
		expect(postMock).toHaveBeenCalledWith(`${BASE}/offers/21/decline`, { note: "Took another job" })
		expect(postMock).toHaveBeenCalledWith(`${BASE}/offers/22/withdraw`)
	})

	it("manages stages, requisitions, openings and candidates", async () => {
		patchMock.mockResolvedValue({ message: "ok" })
		delMock.mockResolvedValue(undefined)

		await hr.createStage({ code: "screening", name: { ar: "فرز" }, sort: 20 })
		await hr.updateStage(2, { is_active: false })
		await hr.cancelRequisition(4)
		await hr.closeRequisition(4)
		await hr.createOpening(4, { title: null, description: null, employment_type: null, work_location_id: null, visibility: "internal", closes_on: null, open: true })
		await hr.openOpening(9)
		await hr.closeOpening(9)
		await hr.updateCandidate(5, { notes: "Strong portfolio" })
		await expect(hr.eraseCandidate(5)).resolves.toEqual({})

		expect(postMock).toHaveBeenCalledWith(`${BASE}/pipeline-stages`, { code: "screening", name: { ar: "فرز" }, sort: 20 })
		expect(patchMock).toHaveBeenCalledWith(`${BASE}/pipeline-stages/2`, { is_active: false })
		expect(postMock).toHaveBeenCalledWith(`${BASE}/requisitions/4/cancel`)
		expect(postMock).toHaveBeenCalledWith(`${BASE}/requisitions/4/close`)
		expect(postMock).toHaveBeenCalledWith(`${BASE}/requisitions/4/job-openings`, expect.objectContaining({ visibility: "internal", open: true }))
		expect(postMock).toHaveBeenCalledWith(`${BASE}/job-openings/9/open`)
		expect(postMock).toHaveBeenCalledWith(`${BASE}/job-openings/9/close`)
		expect(patchMock).toHaveBeenCalledWith(`${BASE}/candidates/5`, { notes: "Strong portfolio" })
		expect(delMock).toHaveBeenCalledWith(`${BASE}/candidates/5`)
	})

	it("serves the employee's side", async () => {
		getMock.mockResolvedValue({ data: [] })
		putMock.mockResolvedValue({ message: "ok" })

		await hr.myOpenings()
		await hr.applyInternally(9, "I know the team", null)
		await hr.myApplications()
		await hr.myRequisitions()
		await hr.myInterviews()
		await hr.saveScorecard(11, { recommendation: "yes", ratings: { communication: 4 }, notes: null })

		expect(getMock).toHaveBeenCalledWith(`${BASE}/me/job-openings`)
		expect(postMock).toHaveBeenCalledWith(`${BASE}/me/job-openings/9/apply`, { cover_letter: "I know the team" })
		expect(putMock).toHaveBeenCalledWith(`${BASE}/me/interviews/11/scorecard`, { recommendation: "yes", ratings: { communication: 4 }, notes: null })
	})
})
