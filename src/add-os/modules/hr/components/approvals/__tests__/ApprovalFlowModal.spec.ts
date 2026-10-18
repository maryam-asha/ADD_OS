import type { ApprovalFlow } from "@/add-os/modules/hr/types/approvals"
import { flushPromises, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import en from "@/add-os/lang/en/en.json"
import enApprovals from "@/add-os/lang/en/hr-approvals.json"
import enHr from "@/add-os/lang/en/hr.json"
import ApprovalFlowModal from "../ApprovalFlowModal.vue"

const { createMock, updateMock, errorMock } = vi.hoisted(() => ({ createMock: vi.fn(), updateMock: vi.fn(), errorMock: vi.fn() }))

vi.mock("@/add-os/config/permissions", () => ({ canViewEmployees: () => true }))
vi.mock("@/add-os/services/hr/approvals", () => ({ createApprovalFlow: createMock, updateApprovalFlow: updateMock }))
vi.mock("@/add-os/services/hr/core", () => ({ listEmployees: vi.fn(), getEmployee: vi.fn().mockResolvedValue({ id: 9, employee_number: "E-9", name: { ar: "سامر", en: "Samer" } }) }))
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: vi.fn(), error: errorMock }) }
})

const i18n = createI18n({ legacy: false, locale: "en", messages: { en: { ...en, ...enHr, ...enApprovals } } })

interface StepVm { approver: string; ability: string | null; employeeId: number | null; timeoutHours: number | null; onTimeout: string }
interface DrawerVm { requestType: string | null; steps: StepVm[]; addStep: () => void; move: (i: number, by: -1 | 1) => void; save: () => Promise<void> }

async function mountDrawer(flow: ApprovalFlow | null = null) {
	const wrapper = mount(ApprovalFlowModal, {
		props: { flow, types: ["leave", "loan"], takenTypes: ["loan"], show: false },
		global: { plugins: [i18n], stubs: { Icon: true } },
		attachTo: document.body
	})
	await wrapper.setProps({ show: true })
	await flushPromises()
	return { wrapper, vm: wrapper.vm as unknown as DrawerVm }
}

describe("approvalFlowModal", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		createMock.mockResolvedValue({ id: 1 })
		updateMock.mockResolvedValue({ message: "The approval flow has been updated." })
	})

	afterEach(() => {
		document.body.innerHTML = ""
	})

	it("sends each step with only the keys that apply, in the order set", async () => {
		const { wrapper, vm } = await mountDrawer()

		vm.requestType = "leave"
		Object.assign(vm.steps[0], { timeoutHours: 48 })
		vm.addStep()
		Object.assign(vm.steps[1], { approver: "ability", ability: "hr.leave.manage" })
		vm.addStep()
		Object.assign(vm.steps[2], { approver: "unit_head" })
		vm.move(2, -1)
		await vm.save()
		await flushPromises()

		expect(createMock).toHaveBeenCalledWith({
			request_type: "leave",
			name: null,
			is_active: true,
			steps: [{ approver: "direct_manager", timeout_hours: 48, on_timeout: "escalate" }, { approver: "unit_head" }, { approver: "ability", ability: "hr.leave.manage" }]
		})
		expect(wrapper.emitted("saved")).toHaveLength(1)
		wrapper.unmount()
	})

	it("holds back a step that names no permission or employee", async () => {
		const { wrapper, vm } = await mountDrawer()

		vm.requestType = "leave"
		Object.assign(vm.steps[0], { approver: "employee" })
		await vm.save()

		expect(createMock).not.toHaveBeenCalled()
		expect(document.body.textContent).toContain("Choose the permission or the employee")
		wrapper.unmount()
	})

	it("edits a flow without resending its request type", async () => {
		const { wrapper, vm } = await mountDrawer({ id: 4, request_type: "leave", name: { ar: "مسار", en: null }, steps: [{ approver: "employee", employee_id: 9 }], is_active: true })

		expect(vm.steps[0].employeeId).toBe(9)
		await vm.save()
		await flushPromises()

		expect(updateMock).toHaveBeenCalledWith(4, { name: { ar: "مسار", en: null }, steps: [{ approver: "employee", employee_id: 9 }], is_active: true })
		wrapper.unmount()
	})
})
