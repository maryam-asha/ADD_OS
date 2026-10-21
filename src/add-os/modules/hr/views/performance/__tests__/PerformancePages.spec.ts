import type { Review, ReviewCycle } from "@/add-os/modules/hr/types/performance"
import { flushPromises, mount } from "@vue/test-utils"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import en from "@/add-os/lang/en/en.json"
import enApprovals from "@/add-os/lang/en/hr-approvals.json"
import enLeave from "@/add-os/lang/en/hr-leave.json"
import enPayroll from "@/add-os/lang/en/hr-payroll.json"
import enPerformance from "@/add-os/lang/en/hr-performance.json"
import enHr from "@/add-os/lang/en/hr.json"
import { ApiError } from "@/add-os/services/api"
import ReviewDrawer from "../../../components/performance/ReviewDrawer.vue"
import ReviewModal from "../../../components/performance/ReviewModal.vue"
import ReviewCyclePage from "../ReviewCyclePage.vue"

const mocks = vi.hoisted(() => ({
	getCycle: vi.fn(),
	listReviews: vi.fn(),
	launch: vi.fn(),
	advance: vi.fn(),
	getTeamReview: vi.fn(),
	getMyReview: vi.fn(),
	submitManager: vi.fn(),
	submitSelf: vi.fn(),
	success: vi.fn(),
	error: vi.fn(),
	dialog: vi.fn((options: { onPositiveClick: () => unknown }) => options.onPositiveClick()),
	permissions: { manage: true, events: true },
	push: vi.fn(),
	route: { params: { id: "3" } as Record<string, string>, query: {} }
}))

vi.mock("@/add-os/config/permissions", () => ({
	canManagePerformance: () => mocks.permissions.manage,
	canViewEmployees: () => mocks.permissions.events,
	canRecordEmploymentEvents: () => mocks.permissions.events
}))
vi.mock("@/add-os/services/hr/performance", () => ({
	getCycle: mocks.getCycle,
	listCycleReviews: mocks.listReviews,
	launchCycle: mocks.launch,
	advanceCycle: mocks.advance,
	addToCycle: vi.fn(),
	getReview: vi.fn(),
	listTemplates: vi.fn().mockResolvedValue([]),
	getTeamReview: mocks.getTeamReview,
	getMyReview: mocks.getMyReview,
	submitManagerReview: mocks.submitManager,
	submitSelfReview: mocks.submitSelf
}))
vi.mock("@/add-os/services/hr/core", () => ({ getEmployee: vi.fn(), listEmployees: vi.fn(), listOrgUnits: vi.fn().mockResolvedValue([]) }))
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: mocks.success, error: mocks.error }), useDialog: () => ({ warning: mocks.dialog }) }
})
vi.mock("vue-router", async () => {
	const actual = await vi.importActual<typeof import("vue-router")>("vue-router")
	return { ...actual, useRouter: () => ({ push: mocks.push }), useRoute: () => mocks.route }
})

const i18n = createI18n({ legacy: false, locale: "en", messages: { en: { ...en, ...enHr, ...enApprovals, ...enLeave, ...enPayroll, ...enPerformance } } })
const labels = () => [...document.querySelectorAll("button")].map(b => b.textContent?.trim()).filter(Boolean)
const click = (label: string) => [...document.querySelectorAll("button")].find(b => b.textContent?.trim() === label)?.click()

function cycle(overrides: Partial<ReviewCycle> = {}): ReviewCycle {
	return {
		id: 3,
		name: { ar: "التقييم السنوي", en: "Annual review" },
		review_template_id: 1,
		template: { scale_max: 5, competencies: [], goals_weight: 40 },
		period_start: "2026-01-01",
		period_end: "2026-12-31",
		org_unit_id: null,
		status: "self_review",
		goals_due_on: null,
		self_due_on: null,
		manager_due_on: null,
		launched_at: null,
		closed_at: null,
		reviews_by_status: { open: 3, self_submitted: 2 },
		...overrides
	}
}

function review(overrides: Partial<Review> = {}): Review {
	return {
		id: 40,
		cycle: { id: 3, name: { ar: "التقييم السنوي", en: "Annual review" }, status: "manager_review", period_start: "2026-01-01", period_end: "2026-12-31", scale_max: 5 },
		employee: { id: 9, employee_number: "E-9", name: { ar: "سارة", en: "Sara" } },
		reviewer: { id: 7, employee_number: "E-7", name: { ar: "رامي", en: "Rami" } },
		status: "self_submitted",
		items: [
			{ kind: "competency", key: "teamwork", name: { ar: "العمل الجماعي", en: "Teamwork" }, self_rating: 4, self_comment: "Led the move", manager_rating: null, manager_comment: null },
			{ kind: "goal", key: "12", name: "Raise occupancy", self_rating: null, self_comment: null, manager_rating: null, manager_comment: null }
		],
		self_comment: null,
		self_submitted_at: null,
		manager_comment: null,
		manager_submitted_at: null,
		recommendation: null,
		scores: null,
		final_rating: null,
		finalized_at: null,
		...overrides
	}
}

describe("performance pages", () => {
	beforeAll(() => {
		setCurrentLocale("en")
	})

	beforeEach(() => {
		vi.clearAllMocks()
		mocks.permissions.manage = true
		mocks.permissions.events = true
		mocks.listReviews.mockResolvedValue({ data: [review()], meta: { current_page: 1, last_page: 1, per_page: 100, total: 1 } })
		mocks.advance.mockResolvedValue({ message: "The cycle has moved to manager_review." })
	})

	afterEach(() => {
		document.body.innerHTML = ""
	})

	afterAll(() => {
		setCurrentLocale("ar")
	})

	describe("a cycle", () => {
		it("offers the one next phase, and asks first", async () => {
			mocks.getCycle.mockResolvedValue(cycle())
			const wrapper = mount(ReviewCyclePage, { global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
			await flushPromises()

			expect(labels()).toContain("Move to Manager review")
			expect(labels()).not.toContain("Launch")
			expect(labels()).not.toContain("Edit")
			click("Move to Manager review")
			await flushPromises()

			expect(mocks.dialog).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining("Self reviews close") }))
			expect(mocks.advance).toHaveBeenCalledWith(3)
			wrapper.unmount()
		})

		it("in draft offers editing and launching, and no reviews yet", async () => {
			mocks.getCycle.mockResolvedValue(cycle({ status: "draft", template: null }))
			const wrapper = mount(ReviewCyclePage, { global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
			await flushPromises()

			expect(labels()).toEqual(expect.arrayContaining(["Edit", "Launch"]))
			expect(mocks.listReviews).not.toHaveBeenCalled()
			wrapper.unmount()
		})

		it("closed offers no step, and a reader without manage sees none", async () => {
			mocks.getCycle.mockResolvedValue(cycle({ status: "closed" }))
			const closed = mount(ReviewCyclePage, { global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
			await flushPromises()
			expect(labels().some(l => l?.startsWith("Move to"))).toBe(false)
			closed.unmount()

			document.body.innerHTML = ""
			mocks.permissions.manage = false
			mocks.getCycle.mockResolvedValue(cycle())
			const reader = mount(ReviewCyclePage, { global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
			await flushPromises()
			expect(labels().some(l => l?.startsWith("Move to"))).toBe(false)
			reader.unmount()
		})
	})

	describe("the review form", () => {
		async function openForm(side: "self" | "manager") {
			const wrapper = mount(ReviewModal, { props: { show: false, reviewId: 40, side }, global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
			await wrapper.setProps({ show: true })
			await flushPromises()
			return { wrapper, vm: wrapper.vm as unknown as { answers: { rating: number | null }[]; problem: string; submit: () => Promise<void> } }
		}

		it("makes the reviewer rate every item, then sends ratings with the recommendation", async () => {
			mocks.getTeamReview.mockResolvedValue(review())
			mocks.submitManager.mockResolvedValue({ message: "The review has been submitted." })
			const { wrapper, vm } = await openForm("manager")

			expect(document.body.textContent).toContain("They rated 4")
			expect(vm.problem).toBe("Rate every item before sending.")
			vm.answers[0].rating = 4
			vm.answers[1].rating = 3
			await flushPromises()
			expect(vm.problem).toBe("")
			await vm.submit()

			expect(mocks.submitManager).toHaveBeenCalledWith(40, {
				answers: [
					{ kind: "competency", key: "teamwork", rating: 4, comment: null },
					{ kind: "goal", key: "12", rating: 3, comment: null }
				],
				comment: null,
				recommendation: null
			})
			expect(mocks.success).toHaveBeenCalledWith("The review has been submitted.")
			wrapper.unmount()
		})

		it("lets the employee leave items unrated, and shows the server's refusal", async () => {
			mocks.getMyReview.mockResolvedValue(review({ cycle: { ...review().cycle, status: "self_review" }, status: "open" }))
			mocks.submitSelf.mockRejectedValue(new ApiError(422, JSON.stringify({ message: "The cycle is not in the phase for this review." })))
			const { wrapper, vm } = await openForm("self")

			vm.answers[1].rating = 5
			expect(vm.problem).toBe("")
			await vm.submit()

			expect(mocks.submitSelf).toHaveBeenCalledWith(40, { answers: [{ kind: "competency", key: "teamwork", rating: 4, comment: "Led the move" }, { kind: "goal", key: "12", rating: 5, comment: null }], comment: null })
			expect(mocks.error).toHaveBeenCalledWith("The cycle is not in the phase for this review.")
			wrapper.unmount()
		})
	})

	describe("a recommended promotion", () => {
		const finalized = (recommendation: "promotion" | "none") => review({ status: "finalized", recommendation, cycle: { ...review().cycle, status: "closed" } })

		async function openDrawer(r: Review) {
			const load = vi.fn().mockResolvedValue(r)
			const wrapper = mount(ReviewDrawer, { props: { show: false, reviewId: 40, load, mayManage: true }, global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body } as never)
			await wrapper.setProps({ show: true })
			await flushPromises()
			return wrapper
		}

		const recordButton = () => [...document.querySelectorAll("button")].find(b => b.textContent?.trim() === "Record the promotion")

		it("opens the employee's file on a promotion event, and applies nothing itself", async () => {
			const wrapper = await openDrawer(finalized("promotion"))

			expect(document.body.textContent).toContain("Nothing changes until it is recorded")
			recordButton()?.click()
			expect(mocks.push).toHaveBeenCalledWith({ name: "hr.employeeProfile", params: { id: 9 }, query: { event: "promotion" } })
			wrapper.unmount()
		})

		it("is offered only for a finalized promotion, to whoever may record events", async () => {
			const none = await openDrawer(finalized("none"))
			expect(recordButton()).toBeUndefined()
			none.unmount()

			document.body.innerHTML = ""
			const open = await openDrawer(review({ recommendation: "promotion" }))
			expect(recordButton()).toBeUndefined()
			open.unmount()

			document.body.innerHTML = ""
			mocks.permissions.events = false
			const reader = await openDrawer(finalized("promotion"))
			expect(recordButton()).toBeUndefined()
			reader.unmount()
		})
	})
})
