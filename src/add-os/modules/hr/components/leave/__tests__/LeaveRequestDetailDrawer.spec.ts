import type { LeaveRequest } from "@/add-os/modules/hr/types/leave"
import { flushPromises, mount } from "@vue/test-utils"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import en from "@/add-os/lang/en/en.json"
import enApprovals from "@/add-os/lang/en/hr-approvals.json"
import enLeave from "@/add-os/lang/en/hr-leave.json"
import enHr from "@/add-os/lang/en/hr.json"
import LeaveRequestDetailDrawer from "../LeaveRequestDetailDrawer.vue"

const mocks = vi.hoisted(() => ({
	success: vi.fn(),
	error: vi.fn(),
	dialog: vi.fn((options: { onPositiveClick: () => unknown }) => options.onPositiveClick())
}))

vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: mocks.success, error: mocks.error }), useDialog: () => ({ warning: mocks.dialog }) }
})

const i18n = createI18n({ legacy: false, locale: "en", messages: { en: { ...en, ...enHr, ...enApprovals, ...enLeave } } })

function leave(status: LeaveRequest["status"], approval: LeaveRequest["approval"]): LeaveRequest {
	return {
		id: 11,
		employee: { id: 9, employee_number: "ADD-0009", name: { ar: "يزن دبس", en: "Yazan Dibs" } },
		leave_type: { id: 1, code: "annual", name: { ar: "إجازة سنوية", en: "Annual leave" }, unit: "day" },
		starts_on: "2026-10-25",
		ends_on: "2026-10-31",
		half_day: null,
		hours: null,
		amount: "5",
		reason: null,
		document_id: null,
		status,
		approval,
		created_at: "2026-10-21T10:20:00+00:00",
		cancelled_at: null
	} as LeaveRequest
}

async function open(request: LeaveRequest, cancel?: (id: number) => Promise<{ message: string }>) {
	const wrapper = mount(LeaveRequestDetailDrawer, {
		props: { requestId: request.id, load: vi.fn().mockResolvedValue(request), cancel, show: false },
		global: { plugins: [i18n], stubs: { Icon: true } },
		attachTo: document.body
	})
	await wrapper.setProps({ show: true })
	await flushPromises()
	return wrapper
}

const cancelButton = () => [...document.querySelectorAll("button")].find(b => b.textContent?.trim() === "Cancel leave")

describe("leaveRequestDetailDrawer", () => {
	beforeAll(() => {
		setCurrentLocale("en")
	})

	beforeEach(() => {
		vi.clearAllMocks()
	})

	afterEach(() => {
		document.body.innerHTML = ""
	})

	afterAll(() => {
		setCurrentLocale("ar")
	})

	it("reads the open step of a pending request", async () => {
		const wrapper = await open(leave("pending", { id: 30, status: "pending", current_step: 2 }))

		expect(document.body.textContent).toContain("Pending")
		expect(document.body.textContent).toContain("Step 2")
		wrapper.unmount()
	})

	/**
	 * ADD Core answers `current_step: null` once a request is decided. The
	 * drawer formatted that null and threw inside the render: an approved
	 * leave opened blank and HR could not reach Cancel (live run, 2026-10-21).
	 */
	it("shows a decided request without a step, and still offers to cancel it", async () => {
		const cancel = vi.fn().mockResolvedValue({ message: "The leave request has been cancelled." })
		const wrapper = await open(leave("approved", { id: 30, status: "approved", current_step: null }), cancel)

		expect(document.body.textContent).toContain("Yazan Dibs")
		expect(document.body.textContent).toContain("Approved")
		expect(document.body.textContent).not.toContain("Step")

		cancelButton()!.click()
		await flushPromises()

		expect(cancel).toHaveBeenCalledWith(11)
		expect(mocks.success).toHaveBeenCalledWith("The leave request has been cancelled.")
		wrapper.unmount()
	})

	it("offers no cancel for a request already cancelled", async () => {
		const wrapper = await open(leave("cancelled", { id: 30, status: "cancelled", current_step: null }), vi.fn())

		expect(document.body.textContent).toContain("Annual leave")
		expect(cancelButton()).toBeUndefined()
		wrapper.unmount()
	})
})
