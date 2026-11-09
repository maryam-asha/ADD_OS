import type { ApprovalFlow } from "@/add-os/modules/hr/types/approvals"
import { flushPromises, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import en from "@/add-os/lang/en/en.json"
import enApprovals from "@/add-os/lang/en/hr-approvals.json"
import enHr from "@/add-os/lang/en/hr.json"
import ApprovalFlowsPage from "../ApprovalFlowsPage.vue"

const mocks = vi.hoisted(() => ({
	types: vi.fn(),
	flows: vi.fn(),
	create: vi.fn(),
	update: vi.fn(),
	remove: vi.fn(),
	error: vi.fn(),
	dialog: vi.fn((options: { onPositiveClick: () => unknown }) => options.onPositiveClick())
}))

vi.mock("@/add-os/config/permissions", () => ({ canViewEmployees: () => true }))
vi.mock("@/add-os/services/hr/approvals", () => ({
	listApprovalTypes: mocks.types,
	listApprovalFlows: mocks.flows,
	createApprovalFlow: mocks.create,
	updateApprovalFlow: mocks.update,
	deleteApprovalFlow: mocks.remove
}))
vi.mock("@/add-os/services/hr/core", () => ({ listEmployees: vi.fn(), getEmployee: vi.fn().mockResolvedValue({ id: 9, employee_number: "E-9", name: { ar: "سامر", en: "Samer" } }) }))
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: vi.fn(), error: mocks.error }), useDialog: () => ({ warning: mocks.dialog }) }
})

const i18n = createI18n({ legacy: false, locale: "en", missingWarn: false, fallbackWarn: false, messages: { en: { ...en, ...enHr, ...enApprovals } } })

interface StepVm { approver: string; ability: string | null; employeeId: number | null; timeoutHours: number | null; onTimeout: string }
interface PageVm {
	selected: string
	current: { steps: StepVm[]; isActive: boolean } | null
	insertStep: (at: number) => void
	move: (i: number, by: -1 | 1) => void
	save: () => Promise<void>
}

const savedLeave: ApprovalFlow = { id: 4, request_type: "leave", name: { ar: "مسار", en: null }, steps: [{ approver: "employee", employee_id: 9 }], is_active: true }

async function mountPage(flows: ApprovalFlow[] = []) {
	mocks.types.mockResolvedValue(["leave", "loan"])
	mocks.flows.mockResolvedValue(flows)
	const wrapper = mount(ApprovalFlowsPage, { global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
	await flushPromises()
	return { wrapper, vm: wrapper.vm as unknown as PageVm }
}

describe("approvalFlowsPage", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.create.mockResolvedValue({ id: 1 })
		mocks.update.mockResolvedValue({ message: "The approval flow has been updated." })
	})

	afterEach(() => {
		document.body.innerHTML = ""
	})

	it("offers only the types the server knows, and opens on the first with one direct-manager step", async () => {
		const { wrapper, vm } = await mountPage()

		const chips = wrapper.findAll("button").map(b => b.text())
		expect(chips.some(text => text.includes("Custody") || text.includes("عهدة"))).toBe(false)
		expect(vm.selected).toBe("leave")
		expect(vm.current!.steps.map(s => s.approver)).toEqual(["direct_manager"])
		expect(document.body.textContent).toContain("This type has no flow yet")
		wrapper.unmount()
	})

	it("sends each step with only the keys that apply, in the order set, with its timeout", async () => {
		const { wrapper, vm } = await mountPage()

		Object.assign(vm.current!.steps[0], { timeoutHours: 48 })
		vm.insertStep(1)
		Object.assign(vm.current!.steps[1], { approver: "ability", ability: "hr.leave.manage" })
		vm.insertStep(2)
		Object.assign(vm.current!.steps[2], { approver: "unit_head" })
		vm.move(2, -1)
		await vm.save()
		await flushPromises()

		expect(mocks.create).toHaveBeenCalledWith({
			request_type: "leave",
			name: null,
			is_active: true,
			steps: [{ approver: "direct_manager", timeout_hours: 48, on_timeout: "escalate" }, { approver: "unit_head" }, { approver: "ability", ability: "hr.leave.manage" }]
		})
		wrapper.unmount()
	})

	it("holds back a step that names no permission or employee", async () => {
		const { wrapper, vm } = await mountPage()

		Object.assign(vm.current!.steps[0], { approver: "employee" })
		await vm.save()
		await flushPromises()

		expect(mocks.create).not.toHaveBeenCalled()
		expect(document.body.textContent).toContain("Choose the permission or the employee")
		wrapper.unmount()
	})

	it("reads a saved flow's steps as the server stores them, and updates it without resending its type", async () => {
		const { wrapper, vm } = await mountPage([savedLeave])

		expect(vm.current!.steps[0]).toMatchObject({ approver: "employee", employeeId: 9 })
		await vm.save()
		await flushPromises()

		expect(mocks.update).toHaveBeenCalledWith(4, { name: { ar: "مسار", en: null }, steps: [{ approver: "employee", employee_id: 9 }], is_active: true })
		wrapper.unmount()
	})

	it("keeps each type's unsaved steps while another is looked at", async () => {
		const { wrapper, vm } = await mountPage()

		vm.insertStep(1)
		vm.selected = "loan"
		await flushPromises()
		expect(vm.current!.steps).toHaveLength(1)
		vm.selected = "leave"
		await flushPromises()
		expect(vm.current!.steps).toHaveLength(2)
		wrapper.unmount()
	})

	it("deletes a flow once confirmed, so the type goes back to the direct manager alone", async () => {
		mocks.remove.mockResolvedValue(undefined)
		const { wrapper } = await mountPage([savedLeave])

		await wrapper.findAll("button").find(b => b.text().includes("Delete flow"))!.trigger("click")
		await flushPromises()

		expect(mocks.remove).toHaveBeenCalledWith(4)
		expect(mocks.flows).toHaveBeenCalledTimes(2)
		wrapper.unmount()
	})
})
