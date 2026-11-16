import type { ApprovalRequest, ApprovalStatus } from "@/add-os/modules/hr/types/approvals"
import type { UpdateResult } from "@/add-os/services/hr/core"
import type { AdminUser } from "@/types/auth.d"
import { flushPromises, mount } from "@vue/test-utils"
import { createPinia, setActivePinia } from "pinia"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import en from "@/add-os/lang/en/en.json"
import enApprovals from "@/add-os/lang/en/hr-approvals.json"
import enHr from "@/add-os/lang/en/hr.json"
import { ApiError } from "@/add-os/services/api"
import { useAuthStore } from "@/stores/auth"
import ApprovalDetailDrawer from "../ApprovalDetailDrawer.vue"

const { successMock, errorMock } = vi.hoisted(() => ({ successMock: vi.fn(), errorMock: vi.fn() }))

vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: successMock, error: errorMock }) }
})

const i18n = createI18n({ legacy: false, locale: "en", messages: { en: { ...en, ...enHr, ...enApprovals } } })

function request(status: ApprovalStatus = "pending"): ApprovalRequest {
	return {
		id: 5,
		request_type: "loan",
		status,
		employee: { id: 7, employee_number: "E-0007", name: { ar: "ريم", en: "Reem" } },
		submitted_by: 3,
		current_step: 1,
		subject: { loan_id: 2, amount: "500", currency: "USD", installments: 5, installment_amount: "100", first_month: "2026-12", reason: "Repairs" },
		steps: [
			{ sort: 1, approver_type: "direct_manager", approver_employee: { id: 9, name: { ar: "سامر", en: "Samer" } }, approver_ability: null, status: "pending", decided_via: null, decided_by: null, comment: null, due_at: null, escalated_at: null, decided_at: null }
		],
		created_at: "2026-10-17T09:00:00+03:00",
		decided_at: null
	}
}

interface DrawerVm { openDecision: (k: "approve" | "reject") => void; comment: string; decide: () => Promise<void>; loadError: string }

interface DrawerCalls {
	load?: (id: number) => Promise<ApprovalRequest>
	approve?: (id: number, comment: string | null) => Promise<UpdateResult>
	reject?: (id: number, comment: string | null) => Promise<UpdateResult>
	override?: boolean
}

async function mountDrawer(options: DrawerCalls = {}) {
	const props = {
		requestId: 5,
		show: false,
		load: options.load ?? vi.fn().mockResolvedValue(request()),
		approve: options.approve ?? vi.fn().mockResolvedValue({ message: "Approved." }),
		reject: options.reject ?? vi.fn().mockResolvedValue({ message: "Rejected." }),
		override: options.override ?? false
	}
	const wrapper = mount(ApprovalDetailDrawer, { props, global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
	await wrapper.setProps({ show: true })
	await flushPromises()
	return { wrapper, props, vm: wrapper.vm as unknown as DrawerVm }
}

/** The drawer is teleported to the body, so its buttons are looked for there. */
function buttonLabels(): string[] {
	return [...document.querySelectorAll("button")].map(b => b.textContent?.trim() ?? "")
}

function signIn(userId: number, employeeId: number | null) {
	setActivePinia(createPinia())
	const employee = employeeId === null ? null : { id: employeeId, employee_number: `E-${employeeId}`, name: { ar: "حساب", en: "Account" }, status: "active" }
	useAuthStore().setLogged({ id: userId, name: "Account", email: "account@test.local", roles: [], permissions: [], employee } as AdminUser)
}

describe("approvalDetailDrawer", () => {
	beforeAll(() => {
		setCurrentLocale("en")
	})

	beforeEach(() => {
		vi.clearAllMocks()
		// Signed in as HR (user 1, employee 9): neither the filer (user 3) nor the subject (employee 7) of the request.
		signIn(1, 9)
	})

	afterEach(() => {
		document.body.innerHTML = ""
	})

	afterAll(() => {
		setCurrentLocale("ar")
	})

	it("shows what the request asks for and who it waits for", async () => {
		const { wrapper } = await mountDrawer()

		const text = document.body.textContent ?? ""
		expect(text).toContain("Reem")
		expect(text).toContain("Repairs")
		expect(text).toContain("Direct manager: Samer")
		expect(text).toContain("Approve")
		wrapper.unmount()
	})

	it("rejects with the comment, shows the server's message, and tells the list to reload", async () => {
		const { wrapper, props, vm } = await mountDrawer()

		vm.openDecision("reject")
		vm.comment = "  Month-end close  "
		await vm.decide()
		await flushPromises()

		expect(props.reject).toHaveBeenCalledWith(5, "Month-end close")
		expect(successMock).toHaveBeenCalledWith("Rejected.")
		expect(wrapper.emitted("decided")).toHaveLength(1)
		wrapper.unmount()
	})

	it("shows the server's refusal and still tells the list to drop a request already decided", async () => {
		const approve = vi.fn().mockRejectedValue(new ApiError(422, JSON.stringify({ message: "This request has already been decided or withdrawn." })))
		const { wrapper, vm } = await mountDrawer({ approve })

		vm.openDecision("approve")
		await vm.decide()
		await flushPromises()

		expect(errorMock).toHaveBeenCalledWith("This request has already been decided or withdrawn.")
		expect(wrapper.emitted("decided")).toHaveLength(1)
		wrapper.unmount()
	})

	it("offers no decision once the request is decided", async () => {
		const { wrapper } = await mountDrawer({ load: vi.fn().mockResolvedValue(request("approved")) })

		expect(document.body.textContent).not.toContain("Reject")
		wrapper.unmount()
	})

	it("says a request that left the inbox is gone, on a 404", async () => {
		const { wrapper, vm } = await mountDrawer({ load: vi.fn().mockRejectedValue(new ApiError(404, JSON.stringify({ message: "Not found." }))) })

		expect(vm.loadError).toContain("no longer waits for you")
		wrapper.unmount()
	})

	it("warns that an override decides in the approver's place", async () => {
		const { wrapper } = await mountDrawer({ override: true })

		expect(document.body.textContent).toContain("recorded as an HR override")
		expect(document.querySelector("[data-test='own-request']")).toBeNull()
		wrapper.unmount()
	})

	it("offers no decision on a request the account filed, even to an override, and says why", async () => {
		signIn(3, null)
		const { wrapper } = await mountDrawer({ override: true })

		expect(document.querySelector("[data-test='own-request']")?.textContent).toContain("Someone else decides this request")
		expect(buttonLabels()).not.toContain("Approve")
		expect(buttonLabels()).not.toContain("Reject")
		expect(document.body.textContent).not.toContain("recorded as an HR override")
		wrapper.unmount()
	})

	it("offers no decision on a request about the account's own employee record, such as a hiring request it manages", async () => {
		signIn(40, 7)
		const requisition = { ...request(), request_type: "requisition", submitted_by: 40 }
		const { wrapper } = await mountDrawer({ override: true, load: vi.fn().mockResolvedValue(requisition) })

		expect(document.querySelector("[data-test='own-request']")).not.toBeNull()
		expect(buttonLabels()).not.toContain("Approve")
		expect(buttonLabels()).not.toContain("Reject")
		wrapper.unmount()
	})

	it("still lets another approver decide that same hiring request", async () => {
		const requisition = { ...request(), request_type: "requisition", submitted_by: 40 }
		const approve = vi.fn().mockResolvedValue({ message: "Approved." })
		const { wrapper, vm } = await mountDrawer({ override: true, load: vi.fn().mockResolvedValue(requisition), approve })

		expect(document.querySelector("[data-test='own-request']")).toBeNull()
		expect(buttonLabels()).toContain("Approve")
		expect(buttonLabels()).toContain("Reject")
		vm.openDecision("approve")
		await vm.decide()
		expect(approve).toHaveBeenCalledWith(5, null)
		wrapper.unmount()
	})

	it("says nothing of ownership once a request of one's own is decided", async () => {
		signIn(3, null)
		const { wrapper } = await mountDrawer({ load: vi.fn().mockResolvedValue(request("approved")) })

		expect(document.querySelector("[data-test='own-request']")).toBeNull()
		wrapper.unmount()
	})
})
