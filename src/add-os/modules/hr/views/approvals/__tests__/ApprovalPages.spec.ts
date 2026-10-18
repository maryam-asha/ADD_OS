import { flushPromises, mount } from "@vue/test-utils"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick } from "vue"
import { createI18n } from "vue-i18n"

import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import en from "@/add-os/lang/en/en.json"
import enApprovals from "@/add-os/lang/en/hr-approvals.json"
import enHr from "@/add-os/lang/en/hr.json"
import ApprovalRequestsPage from "../ApprovalRequestsPage.vue"
import MyApprovalsPage from "../MyApprovalsPage.vue"

const { listRequestsMock, listInboxMock, route } = vi.hoisted(() => ({
	listRequestsMock: vi.fn(),
	listInboxMock: vi.fn(),
	route: { query: {} as Record<string, string> }
}))

vi.mock("@/add-os/config/permissions", () => ({ canViewEmployees: () => false }))
vi.mock("@/add-os/services/hr/approvals", () => ({
	listApprovalRequests: listRequestsMock,
	getApprovalRequest: vi.fn(),
	overrideApprove: vi.fn(),
	overrideReject: vi.fn(),
	listMyApprovals: listInboxMock,
	getMyApproval: vi.fn(),
	approveMyApproval: vi.fn(),
	rejectMyApproval: vi.fn(),
	listMyDelegations: vi.fn().mockResolvedValue([]),
	deleteDelegation: vi.fn()
}))
vi.mock("@/add-os/services/hr/core", () => ({ listEmployees: vi.fn() }))
vi.mock("@/add-os/modules/hr/components/approvals/ApprovalDetailDrawer.vue", () => ({ default: { name: "ApprovalDetailDrawer", props: ["show", "requestId"], render: () => null } }))
vi.mock("@/add-os/modules/hr/components/approvals/DelegationModal.vue", () => ({ default: { name: "DelegationModal", render: () => null } }))
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: vi.fn(), error: vi.fn() }), useDialog: () => ({ warning: vi.fn() }) }
})
vi.mock("vue-router", async () => {
	const actual = await vi.importActual<typeof import("vue-router")>("vue-router")
	return { ...actual, useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), useRoute: () => route }
})

const i18n = createI18n({ legacy: false, locale: "en", messages: { en: { ...en, ...enHr, ...enApprovals } } })

const item = {
	id: 5,
	request_type: "loan",
	status: "pending",
	employee: { id: 7, employee_number: "E-0007", name: { ar: "ريم", en: "Reem" } },
	submitted_by: 3,
	current_step: 1,
	subject: { amount: "500", currency: "USD", installments: 5, installment_amount: "100", first_month: "2026-12", reason: null },
	steps: [],
	created_at: "2026-10-17T09:00:00+03:00",
	decided_at: null
}
const pageOf = (data: unknown[], total = data.length) => ({ data, meta: { current_page: 1, last_page: 1, per_page: 25, total } })
function mountPage(component: typeof MyApprovalsPage | typeof ApprovalRequestsPage) {
  return mount(component, { global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
}

describe("approval pages", () => {
	beforeAll(() => {
		setCurrentLocale("en")
	})

	beforeEach(() => {
		vi.clearAllMocks()
		route.query = {}
		listRequestsMock.mockResolvedValue(pageOf([item]))
		listInboxMock.mockResolvedValue(pageOf([item], 3))
	})

	afterEach(() => {
		document.body.innerHTML = ""
	})

	afterAll(() => {
		setCurrentLocale("ar")
	})

	it("my approvals: lists what waits, counts it, and reloads after a decision", async () => {
		const wrapper = mountPage(MyApprovalsPage)
		await flushPromises()

		expect(listInboxMock).toHaveBeenCalledWith(1)
		expect(document.body.textContent).toContain("Reem")
		expect(document.body.textContent).toContain("Loan")
		expect(document.body.textContent).toContain("3")

		wrapper.findComponent({ name: "ApprovalDetailDrawer" }).vm.$emit("decided")
		await flushPromises()
		expect(listInboxMock).toHaveBeenCalledTimes(2)
		wrapper.unmount()
	})

	it("approval requests: opens on the pending ones", async () => {
		const wrapper = mountPage(ApprovalRequestsPage)
		await flushPromises()

		expect(listRequestsMock).toHaveBeenCalledWith({ page: 1, status: "pending", request_type: null, employee_id: null })
		wrapper.unmount()
	})

	it("approval requests: sends the chosen type, and no status for all of them", async () => {
		const wrapper = mountPage(ApprovalRequestsPage)
		await flushPromises()
		listRequestsMock.mockClear()

		const vm = wrapper.vm as unknown as { filters: { status: string | null; request_type: string | null } }
		vm.filters.status = "all"
		vm.filters.request_type = "leave"
		await nextTick()
		await flushPromises()

		expect(listRequestsMock).toHaveBeenCalledTimes(1)
		expect(listRequestsMock).toHaveBeenCalledWith({ page: 1, status: null, request_type: "leave", employee_id: null })
		wrapper.unmount()
	})
})
