import type { Application } from "@/add-os/modules/hr/types/recruitment"
import { flushPromises, mount } from "@vue/test-utils"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import en from "@/add-os/lang/en/en.json"
import enApprovals from "@/add-os/lang/en/hr-approvals.json"
import enAttendance from "@/add-os/lang/en/hr-attendance.json"
import enBenefits from "@/add-os/lang/en/hr-benefits.json"
import enLeave from "@/add-os/lang/en/hr-leave.json"
import enPayroll from "@/add-os/lang/en/hr-payroll.json"
import enRecruitment from "@/add-os/lang/en/hr-recruitment.json"
import enTimesheets from "@/add-os/lang/en/hr-timesheets.json"
import enHr from "@/add-os/lang/en/hr.json"
import { ApiError } from "@/add-os/services/api"
import ApplicationPage from "../ApplicationPage.vue"
import JobOpeningPage from "../JobOpeningPage.vue"

const mocks = vi.hoisted(() => {
	const stage = (id: number, code: string, type: "open" | "offer" | "hired" | "rejected" | "withdrawn", sort: number) => ({ id, code, name: { ar: code, en: code[0].toUpperCase() + code.slice(1) }, type, sort, is_active: true })
	return {
	stages: [stage(1, "applied", "open", 10), stage(2, "screening", "open", 20), stage(5, "offer", "offer", 80), stage(6, "hired", "hired", 90), stage(7, "rejected", "rejected", 95), stage(8, "withdrawn", "withdrawn", 99)],
	getApplication: vi.fn(),
	move: vi.fn(),
	reject: vi.fn(),
	accept: vi.fn(),
	cvLink: vi.fn(),
	getOpening: vi.fn(),
	listApplications: vi.fn(),
	success: vi.fn(),
	error: vi.fn(),
	dialog: vi.fn((options: { onPositiveClick: () => unknown }) => options.onPositiveClick()),
	permissions: { manage: true, hire: true },
	route: { params: { id: "3" } as Record<string, string>, query: {} }
	}
})

vi.mock("@/add-os/config/permissions", () => ({
	canManageRecruitment: () => mocks.permissions.manage,
	canHireEmployees: () => mocks.permissions.hire,
	canViewEmployees: () => false
}))
vi.mock("@/add-os/services/hr/recruitment", () => ({
	getApplication: mocks.getApplication,
	moveApplication: mocks.move,
	rejectApplication: mocks.reject,
	withdrawApplication: vi.fn(),
	acceptOffer: mocks.accept,
	declineOffer: vi.fn(),
	withdrawOffer: vi.fn(),
	completeInterview: vi.fn(),
	cancelInterview: vi.fn(),
	cvLink: mocks.cvLink,
	getOpening: mocks.getOpening,
	getRequisition: vi.fn().mockResolvedValue({ id: 4, org_unit: { id: 1, name: { ar: "العمليات", en: "Operations" } }, employment_type: "full_time" }),
	listApplications: mocks.listApplications,
	listStages: vi.fn(async () => mocks.stages),
	openOpening: vi.fn(),
	closeOpening: vi.fn(),
	listCandidates: vi.fn().mockResolvedValue({ data: [] })
}))
vi.mock("@/add-os/services/hr/payroll", () => ({ listPayComponents: vi.fn().mockResolvedValue([]), listCurrencyOptions: vi.fn().mockResolvedValue([]) }))
vi.mock("@/add-os/services/hr/core", () => ({ getEmployee: vi.fn(), listEmployees: vi.fn(), listWorkLocations: vi.fn().mockResolvedValue([]) }))
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: mocks.success, error: mocks.error }), useDialog: () => ({ warning: mocks.dialog, error: mocks.dialog }) }
})
vi.mock("vue-router", async () => {
	const actual = await vi.importActual<typeof import("vue-router")>("vue-router")
	return { ...actual, useRouter: () => ({ push: vi.fn(), back: vi.fn() }), useRoute: () => mocks.route, RouterLink: { props: ["to"], template: "<a><slot /></a>" } }
})

const i18n = createI18n({
	legacy: false,
	locale: "en",
	messages: { en: { ...en, ...enHr, ...enApprovals, ...enLeave, ...enAttendance, ...enTimesheets, ...enPayroll, ...enBenefits, ...enRecruitment } }
})
const mountPage = (component: object) => mount(component, { global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })

function application(overrides: Partial<Application> = {}): Application {
	return {
		id: 3,
		opening: { id: 9, title: { ar: "مدير مجتمع", en: "Community manager" } },
		candidate: { id: 5, name: "Rami Haddad", email: "rami@add.sy", phone: null, source: "direct", employee_id: null, consent_at: null, notes: null, created_at: null },
		stage: "screening",
		stage_changed_at: null,
		source: "direct",
		referred_by: null,
		cover_letter: null,
		cv: { name: "cv.pdf", mime: "application/pdf", size: 1000 },
		rejection_reason: null,
		employee_id: null,
		history: [],
		interviews: [],
		offers: [],
		created_at: "2026-10-01T09:00:00+03:00",
		...overrides
	}
}

const labels = () => [...document.querySelectorAll("button")].map(b => b.textContent?.trim()).filter(Boolean)
const click = (label: string) => [...document.querySelectorAll("button")].find(b => b.textContent?.trim() === label)?.click()

describe("recruitment pages", () => {
	beforeAll(() => {
		setCurrentLocale("en")
	})

	beforeEach(() => {
		vi.clearAllMocks()
		Object.assign(mocks.permissions, { manage: true, hire: true })
		mocks.getOpening.mockResolvedValue({ id: 9, requisition_id: 4, title: { ar: "مدير مجتمع", en: "Community manager" }, description: null, employment_type: "full_time", visibility: "internal", status: "open", closes_on: null, opened_at: null, closed_at: null })
	})

	afterEach(() => {
		document.body.innerHTML = ""
	})

	afterAll(() => {
		setCurrentLocale("ar")
	})

	describe("an application", () => {
		it("in progress offers moving, interviewing, an offer and ending it — not hiring", async () => {
			mocks.getApplication.mockResolvedValue(application())
			const wrapper = mountPage(ApplicationPage)
			await flushPromises()

			const all = labels()
			expect(all).toEqual(expect.arrayContaining(["Move", "Schedule interview", "Make offer", "Reject", "Withdraw"]))
			expect(all).not.toContain("Hire")
			wrapper.unmount()
		})

		it("with an accepted offer offers hiring, and says when the account may not hire", async () => {
			const accepted = { id: 20, application_id: 3, start_on: "2026-12-01", expires_on: null, compensation: null, terms: null, status: "accepted" as const, approval_request_id: 1, responded_at: null, response_note: null, created_at: null }
			mocks.getApplication.mockResolvedValue(application({ stage: "offer", offers: [accepted] }))
			const wrapper = mountPage(ApplicationPage)
			await flushPromises()
			expect(labels()).toContain("Hire")
			expect(labels()).not.toContain("Make offer")
			expect(labels()).not.toContain("Move")
			wrapper.unmount()

			document.body.innerHTML = ""
			mocks.permissions.hire = false
			const second = mountPage(ApplicationPage)
			await flushPromises()
			expect(labels()).not.toContain("Hire")
			expect(document.body.textContent).toContain("Hiring needs the permission to add employees.")
			second.unmount()
		})

		it("records an approved offer's answer after asking", async () => {
			const approved = { id: 20, application_id: 3, start_on: "2026-12-01", expires_on: null, compensation: null, terms: null, status: "approved" as const, approval_request_id: 1, responded_at: null, response_note: null, created_at: null }
			mocks.getApplication.mockResolvedValue(application({ stage: "offer", offers: [approved] }))
			mocks.accept.mockResolvedValue({ message: "The offer has been recorded as accepted." })
			const wrapper = mountPage(ApplicationPage)
			await flushPromises()

			click("Accepted")
			await flushPromises()

			expect(mocks.dialog).toHaveBeenCalled()
			expect(mocks.accept).toHaveBeenCalledWith(20)
			expect(mocks.success).toHaveBeenCalledWith("The offer has been recorded as accepted.")
			wrapper.unmount()
		})

		it("ended offers no next steps, and the CV opens through a fresh link", async () => {
			mocks.getApplication.mockResolvedValue(application({ stage: "rejected", rejection_reason: "Not the profile" }))
			mocks.cvLink.mockResolvedValue({ url: "signed-cv-link", expires_at: "2026-10-20T10:05:00+03:00" })
			const opened = vi.spyOn(window, "open").mockImplementation(() => null)
			const wrapper = mountPage(ApplicationPage)
			await flushPromises()

			expect(labels()).not.toContain("Reject")
			expect(document.body.textContent).toContain("Not the profile")
			click("Open CV")
			await flushPromises()
			expect(mocks.cvLink).toHaveBeenCalledWith(3)
			expect(opened).toHaveBeenCalledWith("signed-cv-link", "_blank", "noopener")
			opened.mockRestore()
			wrapper.unmount()
		})

		it("shows the server's refusal of a move as written", async () => {
			mocks.getApplication.mockResolvedValue(application())
			mocks.move.mockRejectedValue(new ApiError(422, JSON.stringify({ message: "This application has already ended or is waiting on its offer." })))
			const wrapper = mountPage(ApplicationPage)
			await flushPromises()

			;(wrapper.vm as unknown as { moveTo: string | null }).moveTo = "applied"
			await flushPromises()
			click("Move")
			await flushPromises()

			expect(mocks.move).toHaveBeenCalledWith(3, "applied", null)
			expect(mocks.error).toHaveBeenCalledWith("This application has already ended or is waiting on its offer.")
			wrapper.unmount()
		})
	})

	describe("an opening's board", () => {
		it("puts each application in its stage's column, reading every page", async () => {
			mocks.route.params = { id: "9" }
			mocks.listApplications
				.mockResolvedValueOnce({ data: [application({ id: 1, stage: "applied" }), application({ id: 2, stage: "screening" })], meta: { current_page: 1, last_page: 2, per_page: 50, total: 3 } })
				.mockResolvedValueOnce({ data: [application({ id: 3, stage: "applied" })], meta: { current_page: 2, last_page: 2, per_page: 50, total: 3 } })
			const wrapper = mountPage(JobOpeningPage)
			await flushPromises()

			expect(mocks.listApplications).toHaveBeenCalledTimes(2)
			const columns = [...document.querySelectorAll("section")].map(s => [s.querySelector("header span")?.textContent, s.querySelectorAll("a").length])
			expect(columns).toEqual([
				["Applied", 2],
				["Screening", 1],
				["Offer", 0],
				["Hired", 0],
				["Rejected", 0],
				["Withdrawn", 0]
			])
			wrapper.unmount()
		})
	})
})
