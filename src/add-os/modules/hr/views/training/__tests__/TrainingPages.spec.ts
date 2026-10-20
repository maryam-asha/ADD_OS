import type { Enrollment, TrainingSession } from "@/add-os/modules/hr/types/training"
import { flushPromises, mount } from "@vue/test-utils"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import en from "@/add-os/lang/en/en.json"
import enApprovals from "@/add-os/lang/en/hr-approvals.json"
import enPayroll from "@/add-os/lang/en/hr-payroll.json"
import enTraining from "@/add-os/lang/en/hr-training.json"
import enHr from "@/add-os/lang/en/hr.json"
import { ApiError } from "@/add-os/services/api"
import CompleteSessionModal from "../../../components/training/CompleteSessionModal.vue"
import MyTrainingPage from "../MyTrainingPage.vue"
import TrainingSessionPage from "../TrainingSessionPage.vue"

const mocks = vi.hoisted(() => ({
	getSession: vi.fn(),
	getCourse: vi.fn(),
	enrollments: vi.fn(),
	cancelSession: vi.fn(),
	complete: vi.fn(),
	openSessions: vi.fn(),
	myEnrollments: vi.fn(),
	enrollMe: vi.fn(),
	success: vi.fn(),
	error: vi.fn(),
	dialog: vi.fn((options: { onPositiveClick: () => unknown }) => options.onPositiveClick()),
	permissions: { manage: true },
	route: { params: { id: "4" } as Record<string, string>, query: {} }
}))

vi.mock("@/add-os/config/permissions", () => ({ canManageTraining: () => mocks.permissions.manage }))
vi.mock("@/add-os/services/hr/training", () => ({
	getSession: mocks.getSession,
	getCourse: mocks.getCourse,
	listSessionEnrollments: mocks.enrollments,
	cancelSession: mocks.cancelSession,
	cancelEnrollment: vi.fn(),
	completeSession: mocks.complete,
	enrollEmployees: vi.fn(),
	createSession: vi.fn(),
	updateSession: vi.fn(),
	openSessions: mocks.openSessions,
	myEnrollments: mocks.myEnrollments,
	enrollMe: mocks.enrollMe,
	cancelMyEnrollment: vi.fn(),
	myCertifications: vi.fn().mockResolvedValue([]),
	myBudget: vi.fn(),
	myLearningRequests: vi.fn().mockResolvedValue([]),
	cancelLearningRequest: vi.fn(),
	requestLearning: vi.fn()
}))
vi.mock("@/add-os/services/hr/core", () => ({ getEmployee: vi.fn(), listEmployees: vi.fn().mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 25, total: 0 } }) }))
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: mocks.success, error: mocks.error }), useDialog: () => ({ warning: mocks.dialog, info: mocks.dialog }) }
})
vi.mock("vue-router", async () => {
	const actual = await vi.importActual<typeof import("vue-router")>("vue-router")
	return { ...actual, useRouter: () => ({ push: vi.fn() }), useRoute: () => mocks.route }
})

const i18n = createI18n({ legacy: false, locale: "en", messages: { en: { ...en, ...enHr, ...enApprovals, ...enPayroll, ...enTraining } } })
const buttons = () => [...document.querySelectorAll("button")]
const button = (label: string) => buttons().find(b => b.textContent?.trim() === label)
const COURSE = { id: 1, code: "barista-101", title: { ar: "أساسيات الباريستا", en: "Barista basics" }, delivery: "in_person" as const }

function session(overrides: Partial<TrainingSession> = {}): TrainingSession {
	return { id: 4, course: COURSE, starts_on: "2026-03-10", ends_on: "2026-03-11", location: "Hall B", trainer: null, capacity: 2, seats_taken: 2, self_enrollment: true, status: "scheduled", ...overrides }
}

function enrollment(id: number, name: string): Enrollment {
	return { id, employee: { id: id + 100, employee_number: `E-${id}`, name: { ar: name, en: name } }, status: "enrolled", completed_on: null, score: null }
}

describe("training pages", () => {
	beforeAll(() => {
		setCurrentLocale("en")
		vi.useFakeTimers({ toFake: ["Date"] })
	})

	beforeEach(() => {
		vi.clearAllMocks()
		mocks.permissions.manage = true
		vi.setSystemTime(new Date(2026, 2, 12, 9, 0))
		mocks.getCourse.mockResolvedValue({ ...COURSE, certification_name: { ar: "شهادة باريستا", en: "Barista certificate" } })
		mocks.enrollments.mockResolvedValue([enrollment(30, "Sara"), enrollment(31, "Rami")])
	})

	afterEach(() => {
		document.body.innerHTML = ""
	})

	afterAll(() => {
		vi.useRealTimers()
		setCurrentLocale("ar")
	})

	describe("a session", () => {
		async function open() {
			const wrapper = mount(TrainingSessionPage, { global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
			await flushPromises()
			return wrapper
		}

		it("offers its steps while scheduled, enrolling only with a seat and completing only once over", async () => {
			mocks.getSession.mockResolvedValue(session())
			const wrapper = await open()

			expect(button("Edit")).toBeTruthy()
			expect(button("Enroll employees")?.disabled).toBe(true)
			expect(button("Complete session")?.disabled).toBe(false)
			expect(document.body.textContent).toContain("Completing this session grants: Barista certificate")
			wrapper.unmount()

			document.body.innerHTML = ""
			vi.setSystemTime(new Date(2026, 2, 10, 9, 0))
			mocks.getSession.mockResolvedValue(session({ seats_taken: 1 }))
			const early = await open()
			expect(button("Enroll employees")?.disabled).toBe(false)
			expect(button("Complete session")?.disabled).toBe(true)
			early.unmount()
		})

		it("cancels after saying how many are enrolled, and shows the server's answer", async () => {
			mocks.getSession.mockResolvedValue(session())
			mocks.cancelSession.mockResolvedValue({ message: "The session has been cancelled and its enrollments with it." })
			const wrapper = await open()

			button("Cancel session")?.click()
			await flushPromises()

			expect(mocks.dialog).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining("its 2 active enrollments") }))
			expect(mocks.cancelSession).toHaveBeenCalledWith(4)
			expect(mocks.success).toHaveBeenCalledWith("The session has been cancelled and its enrollments with it.")
			wrapper.unmount()
		})

		it("offers nothing once completed, nor to a reader without manage", async () => {
			mocks.getSession.mockResolvedValue(session({ status: "completed" }))
			const done = await open()
			expect(button("Edit")).toBeUndefined()
			expect(button("Cancel enrollment")).toBeUndefined()
			done.unmount()

			document.body.innerHTML = ""
			mocks.permissions.manage = false
			mocks.getSession.mockResolvedValue(session())
			const reader = await open()
			expect(button("Edit")).toBeUndefined()
			expect(button("Complete session")).toBeUndefined()
			expect(button("Cancel enrollment")).toBeUndefined()
			reader.unmount()
		})
	})

	describe("completing", () => {
		it("sends who did not come and the others' scores, and shows the server's refusal", async () => {
			mocks.complete.mockRejectedValueOnce(new ApiError(422, JSON.stringify({ message: "A session is completed only once its last day has come." })))
			const wrapper = mount(CompleteSessionModal, {
				props: { show: false, sessionId: 4, enrollments: [enrollment(30, "Sara"), enrollment(31, "Rami")], certifies: true },
				global: { plugins: [i18n], stubs: { Icon: true } },
				attachTo: document.body
			} as never)
			await wrapper.setProps({ show: true })
			await flushPromises()
			const vm = wrapper.vm as unknown as { rows: { id: number; noShow: boolean; score: number | null }[]; save: () => Promise<void> }

			vm.rows[0].score = 92
			vm.rows[1].noShow = true
			vm.rows[1].score = 40
			await vm.save()

			expect(mocks.complete).toHaveBeenCalledWith(4, { no_show_ids: [31], scores: [{ enrollment_id: 30, score: 92 }] })
			expect(mocks.error).toHaveBeenCalledWith("A session is completed only once its last day has come.")
			wrapper.unmount()
		})
	})

	describe("my training", () => {
		it("offers a seat in an open session, not in one I hold, and enrolls after asking", async () => {
			vi.setSystemTime(new Date(2026, 2, 1, 9, 0))
			const held = session({ id: 5, seats_taken: 1 })
			mocks.openSessions.mockResolvedValue([session({ id: 4, seats_taken: 0 }), held])
			mocks.myEnrollments.mockResolvedValue([{ id: 30, session: held, status: "enrolled", completed_on: null, score: null }])
			mocks.enrollMe.mockResolvedValue({ id: 31 })
			const wrapper = mount(MyTrainingPage, { global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
			await flushPromises()

			expect(buttons().filter(b => b.textContent?.trim() === "Enroll")).toHaveLength(1)
			expect(document.body.textContent).toContain("You are enrolled")
			button("Enroll")?.click()
			await flushPromises()

			expect(mocks.dialog).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining("Barista basics") }))
			expect(mocks.enrollMe).toHaveBeenCalledWith(4)
			expect(mocks.success).toHaveBeenCalledWith("You are enrolled.")
			wrapper.unmount()
		})
	})
})
