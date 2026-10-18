import { flushPromises, mount } from "@vue/test-utils"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick } from "vue"
import { createI18n } from "vue-i18n"

import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import en from "@/add-os/lang/en/en.json"
import enApprovals from "@/add-os/lang/en/hr-approvals.json"
import enLeave from "@/add-os/lang/en/hr-leave.json"
import enHr from "@/add-os/lang/en/hr.json"
import LeaveRequestsPage from "../LeaveRequestsPage.vue"
import MyLeavePage from "../MyLeavePage.vue"

const { listRequestsMock, myRequestsMock, myBalancesMock, cancelMineMock, warningMock, permissions, route } = vi.hoisted(() => ({
	listRequestsMock: vi.fn(),
	myRequestsMock: vi.fn(),
	myBalancesMock: vi.fn(),
	cancelMineMock: vi.fn(),
	warningMock: vi.fn((options: { onPositiveClick: () => unknown }) => options.onPositiveClick()),
	permissions: { manage: true },
	route: { query: {} as Record<string, string> }
}))

vi.mock("@/add-os/config/permissions", () => ({ canManageLeave: () => permissions.manage, canViewEmployees: () => false }))
vi.mock("@/add-os/services/hr/leave", () => ({
	listLeaveRequests: listRequestsMock,
	getLeaveRequest: vi.fn(),
	cancelLeaveRequest: vi.fn(),
	listLeaveTypes: vi.fn().mockResolvedValue([]),
	listMyLeaveRequests: myRequestsMock,
	myLeaveBalances: myBalancesMock,
	myLeaveLedger: vi.fn(),
	myTeamLeave: vi.fn(),
	quoteMyLeave: vi.fn(),
	submitMyLeave: vi.fn(),
	cancelMyLeave: cancelMineMock
}))
vi.mock("@/add-os/services/hr/core", () => ({ listEmployees: vi.fn() }))
vi.mock("@/add-os/modules/hr/components/leave/LeaveRequestDetailDrawer.vue", () => ({ default: { name: "LeaveRequestDetailDrawer", props: ["show", "requestId", "cancel"], render: () => null } }))
vi.mock("@/add-os/modules/hr/components/leave/LeaveRequestDrawer.vue", () => ({ default: { name: "LeaveRequestDrawer", render: () => null } }))
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: vi.fn(), error: vi.fn() }), useDialog: () => ({ warning: warningMock }) }
})
vi.mock("vue-router", async () => {
	const actual = await vi.importActual<typeof import("vue-router")>("vue-router")
	return { ...actual, useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), useRoute: () => route }
})

const i18n = createI18n({ legacy: false, locale: "en", messages: { en: { ...en, ...enHr, ...enApprovals, ...enLeave } } })
const pageOf = (data: unknown[]) => ({ data, meta: { current_page: 1, last_page: 1, per_page: 25, total: data.length } })

function leave(status: string, startsOn: string) {
	return {
		id: 3,
		employee: { id: 7, employee_number: "E-0007", name: { ar: "ريم", en: "Reem" } },
		leave_type: { id: 1, code: "annual", name: { ar: "سنوية", en: "Annual" }, unit: "day" },
		starts_on: startsOn,
		ends_on: startsOn,
		half_day: null,
		hours: null,
		amount: "1",
		reason: null,
		document_id: null,
		status,
		approval: null,
		created_at: null,
		cancelled_at: null
	}
}

describe("leave pages", () => {
	beforeAll(() => {
		setCurrentLocale("en")
	})

	beforeEach(() => {
		vi.clearAllMocks()
		permissions.manage = true
		route.query = {}
		listRequestsMock.mockResolvedValue(pageOf([leave("approved", "2026-11-02")]))
		myRequestsMock.mockResolvedValue(pageOf([leave("pending", "2099-01-05")]))
		myBalancesMock.mockResolvedValue([{ leave_type: { id: 1, code: "annual", name: { ar: "سنوية", en: "Annual" }, unit: "day" }, tracks_balance: true, balance: "12", pending: "1", available: "11", max_negative: "0" }])
		cancelMineMock.mockResolvedValue({ message: "The leave request has been cancelled." })
	})

	afterEach(() => {
		document.body.innerHTML = ""
	})

	afterAll(() => {
		setCurrentLocale("ar")
	})

	it("leave requests: sends the chosen status and dates to the server", async () => {
		const wrapper = mount(LeaveRequestsPage, { global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
		await flushPromises()
		listRequestsMock.mockClear()

		const vm = wrapper.vm as unknown as { filters: { status: string | null }; onRange: (v: [string, string] | null) => void }
		vm.filters.status = "pending"
		vm.onRange(["2026-11-01", "2026-11-30"])
		await nextTick()
		await flushPromises()

		expect(listRequestsMock).toHaveBeenCalledTimes(1)
		expect(listRequestsMock).toHaveBeenCalledWith({ page: 1, status: "pending", leave_type_id: null, employee_id: null, from: "2026-11-01", to: "2026-11-30" })
		wrapper.unmount()
	})

	it("leave requests: offers cancelling only with hr.leave.manage", async () => {
		permissions.manage = false
		const wrapper = mount(LeaveRequestsPage, { global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
		await flushPromises()

		expect(wrapper.findComponent({ name: "LeaveRequestDetailDrawer" }).props("cancel")).toBeUndefined()
		wrapper.unmount()
	})

	it("my leave: shows what is available and reloads balances and requests after a cancellation", async () => {
		const wrapper = mount(MyLeavePage, { global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
		await flushPromises()

		expect(document.body.textContent).toContain("11 days")
		const cancel = document.querySelector("button[aria-label='Cancel leave']") as HTMLButtonElement | null
		expect(cancel).not.toBeNull()
		cancel!.click()
		await flushPromises()

		expect(cancelMineMock).toHaveBeenCalledWith(3)
		expect(myBalancesMock).toHaveBeenCalledTimes(2)
		expect(myRequestsMock).toHaveBeenCalledTimes(2)
		wrapper.unmount()
	})
})
