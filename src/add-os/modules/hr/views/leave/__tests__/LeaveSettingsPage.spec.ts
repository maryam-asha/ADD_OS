import { flushPromises, mount } from "@vue/test-utils"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import en from "@/add-os/lang/en/en.json"
import enApprovals from "@/add-os/lang/en/hr-approvals.json"
import enLeave from "@/add-os/lang/en/hr-leave.json"
import enHr from "@/add-os/lang/en/hr.json"
import { ApiError } from "@/add-os/services/api"
import LeaveSettingsPage from "../LeaveSettingsPage.vue"

const mocks = vi.hoisted(() => ({
	types: vi.fn(),
	createType: vi.fn(),
	updateType: vi.fn(),
	deleteType: vi.fn(),
	policies: vi.fn(),
	success: vi.fn(),
	error: vi.fn(),
	dialog: vi.fn((options: { onPositiveClick: () => unknown }) => options.onPositiveClick()),
	annual: {
		id: 1,
		code: "annual",
		name: { ar: "سنوية", en: "Annual" },
		unit: "day",
		is_paid: true,
		tracks_balance: true,
		allows_half_day: true,
		counts_calendar_days: false,
		hide_reason: false,
		requires_attachment: false,
		attachment_document_type_id: null,
		is_active: true
	},
	sick: {
		id: 2,
		code: "sick",
		name: { ar: "مرضية", en: "Sick" },
		unit: "day",
		is_paid: true,
		tracks_balance: false,
		allows_half_day: false,
		counts_calendar_days: true,
		hide_reason: true,
		requires_attachment: true,
		attachment_document_type_id: 5,
		is_active: true
	}
}))

vi.mock("@/add-os/config/permissions", () => ({ canManageHrSettings: () => true }))
vi.mock("@/add-os/services/hr/leave", () => ({
	listLeaveTypes: mocks.types,
	createLeaveType: mocks.createType,
	updateLeaveType: mocks.updateType,
	deleteLeaveType: mocks.deleteType,
	listLeavePolicies: mocks.policies,
	deleteLeavePolicy: vi.fn(),
	createLeavePolicy: vi.fn(),
	updateLeavePolicy: vi.fn(),
	listHolidays: vi.fn().mockResolvedValue([]),
	createHoliday: vi.fn(),
	updateHoliday: vi.fn(),
	deleteHoliday: vi.fn(),
	listCoverageRules: vi.fn().mockResolvedValue([]),
	createCoverageRule: vi.fn(),
	updateCoverageRule: vi.fn(),
	deleteCoverageRule: vi.fn()
}))
vi.mock("@/add-os/services/hr/core", () => ({
	listDocumentTypes: vi.fn().mockResolvedValue([{ id: 5, name: { ar: "تقرير طبي", en: "Medical report" }, is_active: true }]),
	listJobGrades: vi.fn().mockResolvedValue([]),
	listOrgUnits: vi.fn().mockResolvedValue([]),
	listPositions: vi.fn().mockResolvedValue([])
}))
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: mocks.success, error: mocks.error }), useDialog: () => ({ warning: mocks.dialog }) }
})

const i18n = createI18n({ legacy: false, locale: "en", missingWarn: false, fallbackWarn: false, messages: { en: { ...en, ...enHr, ...enApprovals, ...enLeave } } })

interface EditorVm {
	form: Record<string, unknown>
	payload: () => Record<string, unknown>
	save: () => Promise<void>
}

async function mountPage() {
	const wrapper = mount(LeaveSettingsPage, { global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
	await flushPromises()
	return wrapper
}

async function open(wrapper: Awaited<ReturnType<typeof mountPage>>, name: string) {
	await wrapper.findAll("nav button").find(b => b.text().includes(name))!.trigger("click")
	await flushPromises()
	return wrapper.findComponent({ name: "LeaveTypeEditor" }).vm as unknown as EditorVm
}

function policy(id: number, leaveTypeId: number) {
  return {
	id,
	leave_type_id: leaveTypeId,
	name: null,
	effective_from: "2026-01-01",
	effective_to: null,
	accrual_method: "annual_grant",
	annual_entitlement: "21",
	service_tiers: null,
	carry_over_max: null,
	carry_over_expiry_months: null,
	max_negative: "0",
	contract_types: null,
	job_grade_ids: null,
	org_unit_ids: null
}
}

describe("leaveSettingsPage", () => {
	beforeAll(() => {
		setCurrentLocale("en")
	})
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.types.mockResolvedValue([mocks.annual, mocks.sick])
		mocks.policies.mockResolvedValue([policy(10, 1), policy(11, 2)])
	})
	afterEach(() => {
		document.body.innerHTML = ""
	})
	afterAll(() => {
		setCurrentLocale("ar")
	})

	it("lists the types as cards, and edits one beside them with only its own policies under it", async () => {
		const wrapper = await mountPage()
		expect(wrapper.findComponent({ name: "LeaveTypeEditor" }).exists()).toBe(false)

		const vm = await open(wrapper, "Sick")
		expect(vm.form.attachmentTypeId).toBe(5)
		expect(document.body.textContent).toContain("This type's policies")
		expect(wrapper.findAll(".n-data-table-tbody tr")).toHaveLength(1)
		wrapper.unmount()
	})

	it("saves the document type a request needs, never a fixed id, and no half day for an hour type", async () => {
		mocks.updateType.mockResolvedValue({ message: null })
		const wrapper = await mountPage()
		const vm = await open(wrapper, "Annual")

		Object.assign(vm.form, { attachmentTypeId: 5 })
		expect(vm.payload()).toMatchObject({ attachment_document_type_id: 5, allows_half_day: true })
		vm.form.unit = "hour"
		expect(vm.payload()).toMatchObject({ allows_half_day: false, counts_calendar_days: false })
		vm.form.unit = "day"

		await vm.save()
		await flushPromises()
		expect(mocks.updateType).toHaveBeenCalledWith(1, expect.objectContaining({ code: "annual", attachment_document_type_id: 5 }))
		expect(mocks.types).toHaveBeenCalledTimes(2)
		wrapper.unmount()
	})

	it("shows a failed save instead of hiding it", async () => {
		mocks.updateType.mockRejectedValue(new ApiError(500, JSON.stringify({ message: "Server error." })))
		const wrapper = await mountPage()
		const vm = await open(wrapper, "Annual")

		await vm.save()
		await flushPromises()
		expect(mocks.error).toHaveBeenCalledWith("Server error.")
		expect(mocks.success).not.toHaveBeenCalled()
		wrapper.unmount()
	})

	it("keeps a new type open in the editor once saved", async () => {
		const created = { ...mocks.annual, id: 3, code: "unpaid", name: { ar: "بدون راتب", en: "Unpaid" }, is_paid: false }
		mocks.createType.mockResolvedValue(created)
		const wrapper = await mountPage()
		await wrapper.findAll("button").find(b => b.text().includes("Add leave type"))!.trigger("click")
		await flushPromises()

		const vm = wrapper.findComponent({ name: "LeaveTypeEditor" }).vm as unknown as EditorVm
		Object.assign(vm.form, { nameAr: "بدون راتب", code: "unpaid", isPaid: false })
		mocks.types.mockResolvedValue([mocks.annual, mocks.sick, created])
		await vm.save()
		await flushPromises()

		expect(mocks.createType).toHaveBeenCalledWith(expect.objectContaining({ code: "unpaid", is_paid: false, unit: "day" }))
		expect((wrapper.findComponent({ name: "LeaveTypeEditor" }).vm as unknown as EditorVm).form.code).toBe("unpaid")
		wrapper.unmount()
	})

	it("deletes the type in the editor once confirmed, and closes the editor", async () => {
		mocks.deleteType.mockResolvedValue({ message: null })
		const wrapper = await mountPage()
		await open(wrapper, "Sick")

		mocks.types.mockResolvedValue([mocks.annual])
		await wrapper.findAll("button").find(b => b.text().includes("Delete leave type"))!.trigger("click")
		await flushPromises()

		expect(mocks.deleteType).toHaveBeenCalledWith(2)
		expect(wrapper.findComponent({ name: "LeaveTypeEditor" }).exists()).toBe(false)
		wrapper.unmount()
	})
})
