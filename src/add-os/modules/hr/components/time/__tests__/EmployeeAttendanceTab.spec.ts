import { flushPromises, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import en from "@/add-os/lang/en/en.json"
import enApprovals from "@/add-os/lang/en/hr-approvals.json"
import enAttendance from "@/add-os/lang/en/hr-attendance.json"
import enLeave from "@/add-os/lang/en/hr-leave.json"
import enHr from "@/add-os/lang/en/hr.json"
import EmployeeAttendanceTab from "../EmployeeAttendanceTab.vue"

const { cardMock, issueMock, punchesMock, addPunchMock, permissions } = vi.hoisted(() => ({
	cardMock: vi.fn(),
	issueMock: vi.fn(),
	punchesMock: vi.fn(),
	addPunchMock: vi.fn(),
	permissions: { cards: true, correct: true }
}))

vi.mock("@/add-os/config/permissions", () => ({ canManageAttendanceCards: () => permissions.cards, canCorrectAttendance: () => permissions.correct }))
vi.mock("@/add-os/services/hr/time", () => ({
	getAttendanceCard: cardMock,
	issueAttendanceCard: issueMock,
	revokeAttendanceCard: vi.fn(),
	listPunches: punchesMock,
	addManualPunch: addPunchMock
}))
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: vi.fn(), error: vi.fn() }), useDialog: () => ({ warning: (o: { onPositiveClick: () => unknown }) => o.onPositiveClick() }) }
})

const i18n = createI18n({ legacy: false, locale: "en", messages: { en: { ...en, ...enHr, ...enApprovals, ...enLeave, ...enAttendance } } })

interface TabVm { issue: () => Promise<void>; qrValue: string | null; qrVisible: boolean; punchDate: string | null; punchTime: string | null; punchReason: string; addPunch: () => Promise<void> }

function mountTab() {
	return mount(EmployeeAttendanceTab, { props: { employeeId: 7, employeeName: "Reem" }, global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
}

describe("employeeAttendanceTab", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		Object.assign(permissions, { cards: true, correct: true })
		cardMock.mockResolvedValue({ has_card: false, issued_at: null })
		punchesMock.mockResolvedValue([])
		issueMock.mockResolvedValue("card-value-token")
		addPunchMock.mockResolvedValue({ id: 1 })
	})

	afterEach(() => {
		document.body.innerHTML = ""
	})

	it("shows the new card's code to print, and only then", async () => {
		const wrapper = mountTab()
		await flushPromises()
		const vm = wrapper.vm as unknown as TabVm

		await vm.issue()
		await flushPromises()

		expect(issueMock).toHaveBeenCalledWith(7)
		expect(vm.qrVisible).toBe(true)
		expect(vm.qrValue).toBe("card-value-token")
		expect(cardMock).toHaveBeenCalledTimes(2)
		wrapper.unmount()
	})

	it("sends a manual punch as the organisation's wall clock with its reason", async () => {
		const wrapper = mountTab()
		await flushPromises()
		const vm = wrapper.vm as unknown as TabVm

		vm.punchDate = "2026-03-02"
		vm.punchTime = "16:00"
		vm.punchReason = " Reader was down "
		await vm.addPunch()
		await flushPromises()

		expect(addPunchMock).toHaveBeenCalledWith(7, "2026-03-02 16:00", "Reader was down")
		expect(punchesMock).toHaveBeenCalledTimes(2)
		wrapper.unmount()
	})

	it("hides issuing and adding punches without their permissions", async () => {
		Object.assign(permissions, { cards: false, correct: false })
		const wrapper = mountTab()
		await flushPromises()

		const text = document.body.textContent ?? ""
		expect(text).not.toContain("Issue card")
		expect(text).not.toContain("Add a punch")
		wrapper.unmount()
	})
})
