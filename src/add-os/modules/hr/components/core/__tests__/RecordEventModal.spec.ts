import type { Employee } from "@/add-os/modules/hr/types/hr"
import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import en from "@/add-os/lang/en/en.json"
import enHr from "@/add-os/lang/en/hr.json"
import { ApiError } from "@/add-os/services/api"
import RecordEventModal from "../RecordEventModal.vue"

const { recordMock, listPositionsMock, warningMock, successMock, errorMock } = vi.hoisted(() => ({
	recordMock: vi.fn(),
	listPositionsMock: vi.fn(),
	warningMock: vi.fn(),
	successMock: vi.fn(),
	errorMock: vi.fn()
}))

vi.mock("@/add-os/config/permissions", () => ({ canViewEmployees: () => false }))
vi.mock("@/add-os/services/hr/core", () => ({
	recordEmploymentEvent: recordMock,
	listOrgUnits: vi.fn().mockResolvedValue([]),
	listJobGrades: vi.fn().mockResolvedValue([]),
	listWorkLocations: vi.fn().mockResolvedValue([]),
	listPositions: listPositionsMock,
	listEmployees: vi.fn()
}))
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useDialog: () => ({ warning: warningMock }), useMessage: () => ({ success: successMock, error: errorMock, warning: vi.fn() }) }
})

const i18n = createI18n({ legacy: false, locale: "en", messages: { en: { ...en, ...enHr } } })

function employee(): Employee {
	return {
		id: 7,
		employee_number: "E-0007",
		user_id: 3,
		name: { ar: "ريم", en: "Reem" },
		gender: null,
		date_of_birth: null,
		nationality: null,
		marital_status: null,
		phone: null,
		personal_email: null,
		work_email: "reem@add.sy",
		address: null,
		has_national_id: false,
		has_bank_account: false,
		status: "active",
		hired_on: "2025-01-04",
		probation_ends_on: null,
		confirmed_on: null,
		terminated_on: null,
		termination_reason: null,
		current_assignment: {
			id: 1,
			effective_from: "2025-01-04",
			effective_to: null,
			org_unit: { id: 5, name: { ar: "العمليات", en: "Operations" } },
			position: null,
			job_grade: { id: 2, code: "G2", name: { ar: "ثانية", en: "Second" } },
			manager: null,
			work_location: null,
			job_title: null,
			employment_type: "full_time",
			work_mode: "on_site",
			work_pattern_id: null
		},
		current_contract: { id: 1, type: "open_ended", starts_on: "2025-01-04", ends_on: null, notice_period_days: 30, reference: null },
		contacts: [],
		dependents: []
	}
}

interface DrawerVm {
	form: Record<string, unknown>
	submit: () => Promise<void>
	typeOptions: { value: string }[]
}

async function mountDrawer(e: Employee = employee()) {
	const wrapper = mount(RecordEventModal, { props: { employee: e, show: false }, global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
	await wrapper.setProps({ show: true })
	await flushPromises()
	return { wrapper, vm: wrapper.vm as unknown as DrawerVm }
}

describe("recordEventModal", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		recordMock.mockResolvedValue({ id: 30 })
		listPositionsMock.mockResolvedValue([])
	})

	it("offers only the events that can apply: no confirmation without a probation, no rehire for a current employee", async () => {
		const { wrapper, vm } = await mountDrawer()

		const types = vm.typeOptions.map(o => o.value)
		expect(types).toContain("promotion")
		expect(types).toContain("termination")
		expect(types).not.toContain("confirmation")
		expect(types).not.toContain("rehire")
		expect(types).not.toContain("reinstatement")
		wrapper.unmount()
	})

	it("keeps every event but a second termination open during a notice period, and offers only a rehire after it", async () => {
		const leaving = { ...employee(), terminated_on: "2099-12-31" }
		const notice = await mountDrawer(leaving)
		const during = notice.vm.typeOptions.map(o => o.value)
		expect(during).toContain("promotion")
		expect(during).not.toContain("termination")
		expect(during).not.toContain("rehire")
		notice.wrapper.unmount()

		const gone = await mountDrawer({ ...employee(), terminated_on: "2020-01-31", status: "terminated" })
		expect(gone.vm.typeOptions.map(o => o.value)).toEqual(["rehire"])
		gone.wrapper.unmount()
	})

	it("sends a promotion with only what changed from the current assignment", async () => {
		const { wrapper, vm } = await mountDrawer()

		Object.assign(vm.form, { type: "promotion", effectiveOn: "2026-11-01" })
		await flushPromises()
		vm.form.jobGradeId = 3
		await vm.submit()
		await flushPromises()

		expect(recordMock).toHaveBeenCalledWith(7, { type: "promotion", effective_on: "2026-11-01", reason: null, notes: null, assignment: { job_grade_id: 3 } })
		expect(wrapper.emitted("recorded")).toHaveLength(1)
		wrapper.unmount()
	})

	it("keeps the current position when the drawer reopens after the unit was changed", async () => {
		const held = employee()
		held.current_assignment!.position = { id: 11, title: { ar: "منسّق", en: "Coordinator" } }
		const position = { id: 11, org_unit_id: 5, job_grade_id: null, code: null, title: { ar: "منسّق", en: "Coordinator" }, headcount: 2, occupied: 1, is_active: true }
		listPositionsMock.mockImplementation(async (unitId: number) => (unitId === 5 ? [position] : []))
		const { wrapper, vm } = await mountDrawer(held)

		vm.form.orgUnitId = 9
		await flushPromises()
		expect(vm.form.positionId).toBeNull()

		await wrapper.setProps({ show: false })
		await wrapper.setProps({ show: true })
		await flushPromises()
		expect(vm.form.positionId).toBe(11)

		Object.assign(vm.form, { type: "promotion", effectiveOn: "2026-11-01", jobGradeId: 3 })
		await flushPromises()
		await vm.submit()

		expect(recordMock).toHaveBeenCalledWith(7, expect.objectContaining({ assignment: { job_grade_id: 3 } }))
		wrapper.unmount()
	})

	it("asks before a termination and records it only once confirmed", async () => {
		const { wrapper, vm } = await mountDrawer()

		Object.assign(vm.form, { type: "termination", effectiveOn: "2026-12-31", terminationReason: "resignation" })
		await flushPromises()
		await vm.submit()

		expect(recordMock).not.toHaveBeenCalled()
		expect(warningMock).toHaveBeenCalledTimes(1)
		const options = warningMock.mock.calls[0][0] as { content: string; onPositiveClick: () => Promise<void> }
		expect(options.content).toContain("signed out everywhere")

		await options.onPositiveClick()
		expect(recordMock).toHaveBeenCalledWith(7, { type: "termination", effective_on: "2026-12-31", reason: "resignation", notes: null })
		wrapper.unmount()
	})

	it("shows the first field error of a 422 and stays open", async () => {
		recordMock.mockRejectedValue(new ApiError(422, JSON.stringify({ message: "Invalid.", errors: { "contract.ends_on": ["The contract end date must be after the effective date."] } })))
		const { wrapper, vm } = await mountDrawer()

		Object.assign(vm.form, { type: "contract_renewal", effectiveOn: "2026-11-01", contractType: "fixed_term", contractEndsOn: "2026-10-01" })
		await flushPromises()
		await vm.submit()
		await flushPromises()

		expect(errorMock).toHaveBeenCalledWith("The contract end date must be after the effective date.")
		expect(wrapper.emitted("recorded")).toBeUndefined()
		wrapper.unmount()
	})
})
